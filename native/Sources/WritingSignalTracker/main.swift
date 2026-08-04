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

struct ActivitySegment: Codable {
  var application: ApplicationSnapshot
  var startedAt: Date
  var endedAt: Date
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

struct RuleFile: Codable {
  var schemaVersion = 1
  var categories: [String: ActivityCategory] = [:]
  var excludedBundleIdentifiers: [String]?
  var idleAfterSeconds: TimeInterval?
  var pausedUntil: String?
}

struct CollectorSummary: Codable {
  var schemaVersion = 1
  var generatedAt = Date()
  var isTracking = true
  var trackingStartedAt = Date()
  var settings: CollectorSettings
  var activeApplication: ApplicationSnapshot?
  var currentSegmentStartedAt: Date?
  var days: [String: [String: ApplicationUsage]] = [:]
  var segmentsByDay: [String: [ActivitySegment]]?
  var keyboardByDay: [String: KeyboardSummary] = [:]
  var keyboardByDayAndApplication: [String: [String: KeyboardSummary]]?
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

  static var dataDirectory: URL {
    FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".writing-signal", isDirectory: true)
  }

  init() throws {
    let directory = Self.dataDirectory
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

final class RuleStore {
  private let url = SummaryStore.dataDirectory.appendingPathComponent("rules.json")
  private let decoder = JSONDecoder()

  func category(for bundleIdentifier: String) -> ActivityCategory? {
    guard let data = try? Data(contentsOf: url),
          let rules = try? decoder.decode(RuleFile.self, from: data),
          rules.schemaVersion == 1 else { return nil }
    return rules.categories[bundleIdentifier]
  }

  func isExcluded(_ bundleIdentifier: String) -> Bool {
    guard let data = try? Data(contentsOf: url),
          let rules = try? decoder.decode(RuleFile.self, from: data),
          rules.schemaVersion == 1 else { return false }
    return rules.excludedBundleIdentifiers?.contains(bundleIdentifier) ?? false
  }

  func idleAfterSeconds() -> TimeInterval? {
    guard let data = try? Data(contentsOf: url),
          let rules = try? decoder.decode(RuleFile.self, from: data),
          rules.schemaVersion == 1,
          let threshold = rules.idleAfterSeconds,
          threshold >= 15 else { return nil }
    return threshold
  }

  func isPaused() -> Bool {
    guard let data = try? Data(contentsOf: url),
          let rules = try? decoder.decode(RuleFile.self, from: data),
          rules.schemaVersion == 1,
          let pausedUntil = rules.pausedUntil,
          let date = ISO8601DateFormatter().date(from: pausedUntil) else { return false }
    return date > Date()
  }
}

final class Tracker: NSObject {
  private let store: SummaryStore
  private let ruleStore = RuleStore()
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
    self.summary.activeApplication = nil
    self.summary.currentSegmentStartedAt = nil
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
      category: ruleStore.category(for: bundleIdentifier) ?? category(for: bundleIdentifier)
    )
  }

  private func tick() {
    let now = Date()
    let elapsed = now.timeIntervalSince(lastTick)
    defer { lastTick = now }

    let idle = isIdle()
    let paused = ruleStore.isPaused()
    let nextApplication: ApplicationSnapshot?
    if let app = activeApplication(), !ruleStore.isExcluded(app.bundleIdentifier), !idle, !paused {
      nextApplication = app
    } else {
      nextApplication = nil
    }

    if let previous = summary.activeApplication, elapsed > 0, !idle, !paused {
      add(seconds: elapsed, for: previous, on: lastTick)
    }

    if summary.activeApplication != nextApplication {
      if let previous = summary.activeApplication, let startedAt = summary.currentSegmentStartedAt {
        closeSegment(for: previous, startedAt: startedAt, endedAt: idle ? lastTick : now)
      }
      summary.activeApplication = nextApplication
      summary.currentSegmentStartedAt = nextApplication == nil ? nil : now
    }
    summary.generatedAt = now
    store.save(summary)
  }

  private func isIdle() -> Bool {
    // `UInt32.max` is Core Graphics' kCGAnyInputEventType; Swift does not expose a named enum case.
    let anyInputEvent = CGEventType(rawValue: UInt32.max)!
    let idleAfter = ruleStore.idleAfterSeconds() ?? summary.settings.idleAfterSeconds
    return CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: anyInputEvent) > idleAfter
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

  private func closeSegment(for application: ApplicationSnapshot, startedAt: Date, endedAt: Date) {
    guard endedAt > startedAt else { return }
    let key = dayKey(startedAt)
    var segments = summary.segmentsByDay ?? [:]
    segments[key, default: []].append(ActivitySegment(application: application, startedAt: startedAt, endedAt: endedAt))
    let retentionDate = Calendar.current.date(byAdding: .day, value: -14, to: Date()) ?? Date()
    segments = segments.filter { $0.key >= dayKey(retentionDate) }
    summary.segmentsByDay = segments
  }

  private func updateKeyboard(_ update: (inout KeyboardSummary) -> Void) {
    guard let app = summary.activeApplication else { return }
    let key = dayKey(Date())
    var keyboard = summary.keyboardByDay[key] ?? KeyboardSummary()
    update(&keyboard)
    summary.keyboardByDay[key] = keyboard

    var perDay = summary.keyboardByDayAndApplication ?? [:]
    var perApplication = perDay[key] ?? [:]
    var appKeyboard = perApplication[app.bundleIdentifier] ?? KeyboardSummary()
    update(&appKeyboard)
    perApplication[app.bundleIdentifier] = appKeyboard
    perDay[key] = perApplication
    summary.keyboardByDayAndApplication = perDay
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
    let wasInsideWord = currentlyInsideWord
    let update: (inout KeyboardSummary) -> Void
    switch keyCode {
    case 49, 36, 48: // space, return, tab
      currentlyInsideWord = false
      update = { keyboard in
        keyboard.keyDowns += 1
        keyboard.separators += 1
        if wasInsideWord { keyboard.estimatedWords += 1 }
      }
    case 51: // delete
      update = { keyboard in
        keyboard.keyDowns += 1
        keyboard.deletions += 1
      }
    case 56, 58, 59, 60, 61, 62: // modifier keys
      update = { keyboard in keyboard.keyDowns += 1 }
    default:
      currentlyInsideWord = true
      update = { keyboard in
        keyboard.keyDowns += 1
        keyboard.printableKeyDowns += 1
      }
    }
    updateKeyboard(update)
  }
}

struct Arguments {
  var keyboardTracking = false
  var idleAfterSeconds: TimeInterval = 120
  var install = false
  var uninstall = false
}

func parseArguments() -> Arguments {
  var arguments = Arguments()
  let values = Array(CommandLine.arguments.dropFirst())
  var index = 0
  while index < values.count {
    switch values[index] {
    case "--keyboard": arguments.keyboardTracking = true
    case "--install": arguments.install = true
    case "--uninstall": arguments.uninstall = true
    case "--idle-seconds" where index + 1 < values.count:
      index += 1
      arguments.idleAfterSeconds = TimeInterval(values[index]) ?? arguments.idleAfterSeconds
    case "--help":
      print("Usage: writing-signal-tracker [--keyboard] [--idle-seconds 120] [--install | --uninstall]")
      exit(0)
    default: break
    }
    index += 1
  }
  return arguments
}

private let launchAgentLabel = "com.writingsignal.collector"

private var launchAgentURL: URL {
  FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent("Library/LaunchAgents", isDirectory: true)
    .appendingPathComponent("\(launchAgentLabel).plist")
}

private var installedBinaryURL: URL {
  FileManager.default.homeDirectoryForCurrentUser
    .appendingPathComponent("Library/Application Support/WritingSignal/bin", isDirectory: true)
    .appendingPathComponent("writing-signal-tracker")
}

private func runLaunchctl(_ arguments: [String]) throws {
  let process = Process()
  process.executableURL = URL(fileURLWithPath: "/bin/launchctl")
  process.arguments = arguments
  try process.run()
  process.waitUntilExit()
  if process.terminationStatus != 0 { throw NSError(domain: "WritingSignal", code: Int(process.terminationStatus)) }
}

@MainActor private func installLaunchAgent(arguments: Arguments) throws {
  let fileManager = FileManager.default
  try fileManager.createDirectory(at: SummaryStore.dataDirectory, withIntermediateDirectories: true)
  try fileManager.setAttributes([.posixPermissions: 0o700], ofItemAtPath: SummaryStore.dataDirectory.path)
  let binaryDirectory = installedBinaryURL.deletingLastPathComponent()
  try fileManager.createDirectory(at: binaryDirectory, withIntermediateDirectories: true)
  try fileManager.setAttributes([.posixPermissions: 0o700], ofItemAtPath: binaryDirectory.path)

  let currentBinary = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
  if fileManager.fileExists(atPath: installedBinaryURL.path) {
    try fileManager.removeItem(at: installedBinaryURL)
  }
  try fileManager.copyItem(at: currentBinary, to: installedBinaryURL)
  try fileManager.setAttributes([.posixPermissions: 0o755], ofItemAtPath: installedBinaryURL.path)

  let agentDirectory = launchAgentURL.deletingLastPathComponent()
  try fileManager.createDirectory(at: agentDirectory, withIntermediateDirectories: true)
  let launchArguments = [installedBinaryURL.path, "--idle-seconds", String(Int(arguments.idleAfterSeconds))]
    + (arguments.keyboardTracking ? ["--keyboard"] : [])
  let plist: [String: Any] = [
    "Label": launchAgentLabel,
    "ProgramArguments": launchArguments,
    "RunAtLoad": true,
    "KeepAlive": true,
    "ProcessType": "Background",
    "StandardOutPath": SummaryStore.dataDirectory.appendingPathComponent("collector.log").path,
    "StandardErrorPath": SummaryStore.dataDirectory.appendingPathComponent("collector-error.log").path,
  ]
  let data = try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
  try data.write(to: launchAgentURL, options: .atomic)
  try fileManager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: launchAgentURL.path)

  let domain = "gui/\(getuid())"
  try? runLaunchctl(["bootout", domain, launchAgentURL.path])
  try runLaunchctl(["bootstrap", domain, launchAgentURL.path])
  print("Writing Signal collector installed and started. Keyboard aggregates: \(arguments.keyboardTracking ? "enabled" : "disabled").")
}

@MainActor private func uninstallLaunchAgent() throws {
  let fileManager = FileManager.default
  let domain = "gui/\(getuid())"
  if fileManager.fileExists(atPath: launchAgentURL.path) {
    try? runLaunchctl(["bootout", domain, launchAgentURL.path])
    try fileManager.removeItem(at: launchAgentURL)
  }
  if fileManager.fileExists(atPath: installedBinaryURL.path) {
    try fileManager.removeItem(at: installedBinaryURL)
  }
  print("Writing Signal collector uninstalled. Existing local summaries remain until erased in Raycast.")
}

let arguments = parseArguments()
do {
  if arguments.install {
    try installLaunchAgent(arguments: arguments)
    exit(0)
  }
  if arguments.uninstall {
    try uninstallLaunchAgent()
    exit(0)
  }
  let settings = CollectorSettings(keyboardTrackingEnabled: arguments.keyboardTracking, idleAfterSeconds: arguments.idleAfterSeconds)
  let tracker = Tracker(store: try SummaryStore(), settings: settings)
  print("Writing Signal tracker running. Press Control-C to stop.")
  tracker.start()
} catch {
  fputs("Writing Signal tracker failed: \(error)\n", stderr)
  exit(1)
}
