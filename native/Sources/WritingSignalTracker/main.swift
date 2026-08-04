import AppKit
import ApplicationServices
import Foundation

enum ActivityCategory: String, Codable {
  case writing
  case creating
  case consuming
  case other
}

struct ApplicationSnapshot: Codable, Equatable {
  let name: String
  let bundleIdentifier: String
  let category: ActivityCategory
}

struct ApplicationUsage: Codable {
  var name: String
  var bundleIdentifier: String
  var category: ActivityCategory
  var seconds: TimeInterval
}

struct KeyboardSummary: Codable {
  var keyDowns = 0
  var printableKeyDowns = 0
  var separators = 0
  var deletions = 0
  var estimatedWords = 0
}

struct CollectorSettings: Codable {
  var keyboardTrackingEnabled: Bool
  var idleAfterSeconds: TimeInterval
}

struct CollectorSummary: Codable {
  var schemaVersion = 1
  var generatedAt = Date()
  var isTracking = true
  var trackingStartedAt = Date()
  var settings: CollectorSettings
  var activeApplication: ApplicationSnapshot?
  var days: [String: [String: ApplicationUsage]] = [:]
  var keyboardByDay: [String: KeyboardSummary] = [:]
}

private let writingBundles: Set<String> = [
  "com.apple.TextEdit", "com.apple.iWork.Pages", "md.obsidian", "notion.id", "com.microsoft.Word",
]
private let creatingBundles: Set<String> = [
  "com.microsoft.VSCode", "com.apple.dt.Xcode", "com.figma.Desktop", "com.adobe.Photoshop", "com.adobe.illustrator",
]
private let consumingBundles: Set<String> = [
  "com.apple.TV", "com.spotify.client", "com.apple.Music", "com.apple.Safari", "com.google.Chrome", "company.thebrowser.Browser",
]

func category(for bundleIdentifier: String) -> ActivityCategory {
  if writingBundles.contains(bundleIdentifier) { return .writing }
  if creatingBundles.contains(bundleIdentifier) { return .creating }
  if consumingBundles.contains(bundleIdentifier) { return .consuming }
  return .other
}

func dayKey(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.calendar = Calendar(identifier: .gregorian)
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: date)
}

final class SummaryStore {
  private let url: URL
  private let encoder: JSONEncoder
  private let decoder = JSONDecoder()

  init() throws {
    let directory = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".writing-signal", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: directory.path)
    url = directory.appendingPathComponent("summary.json")
    encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    encoder.dateEncodingStrategy = .iso8601
    decoder.dateDecodingStrategy = .iso8601
  }

  func load(settings: CollectorSettings) -> CollectorSummary {
    guard let data = try? Data(contentsOf: url), var saved = try? decoder.decode(CollectorSummary.self, from: data) else {
      return CollectorSummary(settings: settings)
    }
    saved.isTracking = true
    saved.settings = settings
    return saved
  }

  func save(_ summary: CollectorSummary) {
    guard let data = try? encoder.encode(summary) else { return }
    do {
      try data.write(to: url, options: .atomic)
      try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    } catch {
      fputs("Could not save collector summary: \(error)\n", stderr)
    }
  }
}

final class Tracker: NSObject {
  private let store: SummaryStore
  private var summary: CollectorSummary
  private let keyboardTracking: Bool
  private var timer: Timer?
  private var lastTick = Date()
  private var eventTap: CFMachPort?
  private var eventSource: CFRunLoopSource?
  private var currentlyInsideWord = false

  init(store: SummaryStore, settings: CollectorSettings) {
    self.store = store
    self.summary = store.load(settings: settings)
    self.keyboardTracking = settings.keyboardTrackingEnabled
    super.init()
  }

  func start() {
    tick()
    if keyboardTracking { installKeyboardTap() }
    timer = Timer.scheduledTimer(timeInterval: 1, target: self, selector: #selector(tickFromTimer), userInfo: nil, repeats: true)
    RunLoop.main.run()
  }

  @objc private func tickFromTimer() {
    tick()
  }

  private func activeApplication() -> ApplicationSnapshot? {
    guard let app = NSWorkspace.shared.frontmostApplication,
          let bundleIdentifier = app.bundleIdentifier else { return nil }
    return ApplicationSnapshot(
      name: app.localizedName ?? bundleIdentifier,
      bundleIdentifier: bundleIdentifier,
      category: category(for: bundleIdentifier)
    )
  }

  private func tick() {
    let now = Date()
    let elapsed = now.timeIntervalSince(lastTick)
    defer { lastTick = now }

    if let previous = summary.activeApplication, elapsed > 0, !isIdle() {
      add(seconds: elapsed, for: previous, on: lastTick)
    }
    summary.activeApplication = activeApplication()
    summary.generatedAt = now
    store.save(summary)
  }

  private func isIdle() -> Bool {
    // `UInt32.max` is Core Graphics' kCGAnyInputEventType; Swift does not expose a named enum case.
    let anyInputEvent = CGEventType(rawValue: UInt32.max)!
    return CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: anyInputEvent) > summary.settings.idleAfterSeconds
  }

  private func add(seconds: TimeInterval, for app: ApplicationSnapshot, on date: Date) {
    let key = dayKey(date)
    var apps = summary.days[key] ?? [:]
    var usage = apps[app.bundleIdentifier] ?? ApplicationUsage(
      name: app.name, bundleIdentifier: app.bundleIdentifier, category: app.category, seconds: 0
    )
    usage.seconds += seconds
    apps[app.bundleIdentifier] = usage
    summary.days[key] = apps
  }

  private func updateKeyboard(_ update: (inout KeyboardSummary) -> Void) {
    let key = dayKey(Date())
    var keyboard = summary.keyboardByDay[key] ?? KeyboardSummary()
    update(&keyboard)
    summary.keyboardByDay[key] = keyboard
  }

  private func installKeyboardTap() {
    guard CGPreflightListenEventAccess() || CGRequestListenEventAccess() else {
      fputs("Keyboard tracking needs macOS Input Monitoring permission. Continuing with app-only tracking.\n", stderr)
      return
    }
    let mask = CGEventMask(1 << CGEventType.keyDown.rawValue)
    let callback: CGEventTapCallBack = { _, type, event, userInfo in
      guard type == .keyDown, let userInfo else { return Unmanaged.passUnretained(event) }
      let tracker = Unmanaged<Tracker>.fromOpaque(userInfo).takeUnretainedValue()
      tracker.recordKey(event)
      return Unmanaged.passUnretained(event)
    }
    let pointer = Unmanaged.passUnretained(self).toOpaque()
    eventTap = CGEvent.tapCreate(tap: .cgSessionEventTap, place: .headInsertEventTap, options: .listenOnly, eventsOfInterest: mask, callback: callback, userInfo: pointer)
    guard let eventTap else {
      fputs("Could not create keyboard listener. Continuing with app-only tracking.\n", stderr)
      return
    }
    eventSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
    CFRunLoopAddSource(CFRunLoopGetMain(), eventSource, .commonModes)
    CGEvent.tapEnable(tap: eventTap, enable: true)
  }

  private func recordKey(_ event: CGEvent) {
    let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
    updateKeyboard { keyboard in
      keyboard.keyDowns += 1
      switch keyCode {
      case 49, 36, 48: // space, return, tab
        keyboard.separators += 1
        if currentlyInsideWord { keyboard.estimatedWords += 1 }
        currentlyInsideWord = false
      case 51: // delete
        keyboard.deletions += 1
      case 56, 58, 59, 60, 61, 62: // modifier keys
        break
      default:
        keyboard.printableKeyDowns += 1
        currentlyInsideWord = true
      }
    }
  }
}

struct Arguments {
  var keyboardTracking = false
  var idleAfterSeconds: TimeInterval = 120
}

func parseArguments() -> Arguments {
  var arguments = Arguments()
  let values = Array(CommandLine.arguments.dropFirst())
  var index = 0
  while index < values.count {
    switch values[index] {
    case "--keyboard": arguments.keyboardTracking = true
    case "--idle-seconds" where index + 1 < values.count:
      index += 1
      arguments.idleAfterSeconds = TimeInterval(values[index]) ?? arguments.idleAfterSeconds
    case "--help":
      print("Usage: writing-signal-tracker [--keyboard] [--idle-seconds 120]")
      exit(0)
    default: break
    }
    index += 1
  }
  return arguments
}

let arguments = parseArguments()
do {
  let settings = CollectorSettings(keyboardTrackingEnabled: arguments.keyboardTracking, idleAfterSeconds: arguments.idleAfterSeconds)
  let tracker = Tracker(store: try SummaryStore(), settings: settings)
  print("Writing Signal tracker running. Press Control-C to stop.")
  tracker.start()
} catch {
  fputs("Writing Signal tracker failed: \(error)\n", stderr)
  exit(1)
}
