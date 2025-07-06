import Capacitor
import UIKit

@objc(AssistiveTouchPlugin)
public class AssistiveTouchPlugin: CAPPlugin {
    private var button: UIButton?

    @objc func requestOverlayPermission(_ call: CAPPluginCall) {
        // iOS doesn't allow overlays: just resolve true
        call.resolve(["granted": true])
    }

    @objc func show(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.button == nil, let window = UIApplication.shared.windows.first else {
                call.resolve()
                return
            }
            let size: CGFloat = 60
            let btn = UIButton(type: .custom)
            btn.frame = CGRect(x: 100, y: 300, width: size, height: size)
            btn.layer.cornerRadius = size / 2
            btn.backgroundColor = UIColor.systemPurple
            btn.setTitle("⚡️", for: .normal)
            btn.accessibilityLabel = call.getString("label") ?? "Assistive Touch"

            // Single tap
            let tap = UITapGestureRecognizer(target: self, action: #selector(self.singleTap))
            tap.numberOfTapsRequired = 1
            // Double tap
            let dbl = UITapGestureRecognizer(target: self, action: #selector(self.doubleTap))
            dbl.numberOfTapsRequired = 2
            tap.require(toFail: dbl)
            // Long press
            let long = UILongPressGestureRecognizer(target: self, action: #selector(self.longPress))
            long.minimumPressDuration = 0.5

            btn.addGestureRecognizer(dbl)
            btn.addGestureRecognizer(tap)
            btn.addGestureRecognizer(long)

            // Dragging
            let pan = UIPanGestureRecognizer(target: self, action: #selector(self.handlePan(_:)))
            btn.addGestureRecognizer(pan)

            window.addSubview(btn)
            self.button = btn
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.button?.removeFromSuperview()
            self.button = nil
            call.resolve()
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let isEnabled = self.button != nil
            call.resolve(["isEnabled": isEnabled])
        }
    }

    // MARK: – Gesture handlers

    @objc private func singleTap() {
        let feedback = UIImpactFeedbackGenerator(style: .light)
        feedback.impactOccurred()
        notifyListeners("singleTap", data: [:])
    }

    @objc private func doubleTap() {
        let feedback = UIImpactFeedbackGenerator(style: .medium)
        feedback.impactOccurred()
        notifyListeners("doubleTap", data: [:])
    }

    @objc private func longPress() {
        let feedback = UIImpactFeedbackGenerator(style: .heavy)
        feedback.impactOccurred()
        notifyListeners("longPress", data: [:])
    }

    @objc private func handlePan(_ g: UIPanGestureRecognizer) {
        guard let btn = button else { return }
        let translation = g.translation(in: btn.superview)
        btn.center = CGPoint(x: btn.center.x + translation.x, y: btn.center.y + translation.y)
        g.setTranslation(.zero, in: btn.superview)

        if g.state == .ended, let superview = btn.superview {
            let left = btn.frame.minX
            let right = superview.bounds.width - btn.frame.maxX
            let targetX: CGFloat = (left < right) ? 10 : (superview.bounds.width - btn.bounds.width - 10)
            UIView.animate(withDuration: 0.3) {
                btn.frame.origin.x = targetX
            }
        }
    }
}
