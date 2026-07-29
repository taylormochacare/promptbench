import AppKit
import CoreGraphics
import Foundation

func runAppleScript(_ source: String) -> String? {
  var error: NSDictionary?
  guard let script = NSAppleScript(source: source) else { return nil }
  let output = script.executeAndReturnError(&error)
  if let error {
    fputs("AppleScript error: \(error)\n", stderr)
    return nil
  }
  return output.stringValue
}

guard
  let posBeforeStr = runAppleScript(
    """
    tell application "System Events"
      tell process "promptbench"
        set frontmost to true
        delay 0.2
        set p to position of window 1
        return (item 1 of p as text) & "," & (item 2 of p as text)
      end tell
    end tell
    """
  )
else {
  fputs("Could not read promptbench window position. Is the app running?\n", stderr)
  exit(1)
}

let posBefore = posBeforeStr.split(separator: ",").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
guard posBefore.count == 2 else {
  fputs("Unexpected position format: \(posBeforeStr)\n", stderr)
  exit(1)
}

// Drag from center of title bar (x: 500, y: 28 screen coords approx)
// Use window position + offset for title bar center-right area (logo/center region)
let start = CGPoint(x: CGFloat(posBefore[0] + 500), y: CGFloat(posBefore[1] + 28))
let end = CGPoint(x: start.x + 120, y: start.y + 80)

func postMouse(_ type: CGEventType, _ point: CGPoint) {
  guard let event = CGEvent(
    mouseEventSource: nil,
    mouseType: type,
    mouseCursorPosition: point,
    mouseButton: .left
  ) else { return }
  event.post(tap: .cghidEventTap)
}

postMouse(.mouseMoved, start)
usleep(150_000)
postMouse(.leftMouseDown, start)
usleep(150_000)
postMouse(.leftMouseDragged, end)
usleep(150_000)
postMouse(.leftMouseDragged, end)
usleep(150_000)
postMouse(.leftMouseUp, end)
usleep(300_000)

guard
  let posAfterStr = runAppleScript(
    """
    tell application "System Events"
      tell process "promptbench"
        set p to position of window 1
        return (item 1 of p as text) & "," & (item 2 of p as text)
      end tell
    end tell
    """
  )
else {
  fputs("Could not read window position after drag\n", stderr)
  exit(1)
}

let posAfter = posAfterStr.split(separator: ",").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
guard posAfter.count == 2 else {
  fputs("Unexpected position format after drag: \(posAfterStr)\n", stderr)
  exit(1)
}

let deltaX = posAfter[0] - posBefore[0]
let deltaY = posAfter[1] - posBefore[1]
let moved = abs(deltaX) > 20 || abs(deltaY) > 20

print("position_before=\(posBefore[0]),\(posBefore[1])")
print("position_after=\(posAfter[0]),\(posAfter[1])")
print("delta=\(deltaX),\(deltaY)")
print(moved ? "PASS window moved after titlebar drag simulation" : "FAIL window did not move after titlebar drag simulation")

// Restore approximate original position
_ = runAppleScript(
  """
  tell application "System Events"
    tell process "promptbench"
      set position of window 1 to {\(posBefore[0]), \(posBefore[1])}
    end tell
  end tell
  """
)

exit(moved ? 0 : 1)
