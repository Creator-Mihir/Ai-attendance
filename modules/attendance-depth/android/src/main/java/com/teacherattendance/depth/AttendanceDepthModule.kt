package com.teacherattendance.depth

import android.Manifest
import android.content.pm.PackageManager
import com.google.ar.core.ArCoreApk
import com.google.ar.core.CameraConfig
import com.google.ar.core.CameraConfigFilter
import com.google.ar.core.Config
import com.google.ar.core.Session
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AttendanceDepthModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AttendanceDepth")

    AsyncFunction("checkFrontCameraDepthSupport") {
      checkFrontCameraDepthSupport()
    }
  }

  private fun checkFrontCameraDepthSupport(): Map<String, Any?> {
    val context = appContext.reactContext
      ?: return result("UNAVAILABLE", "ERROR", "ANDROID_CONTEXT_UNAVAILABLE")

    if (context.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      return result("UNAVAILABLE", "UNAVAILABLE", "CAMERA_PERMISSION_REQUIRED")
    }

    val availability = try {
      // Use the local availability result synchronously. If ARCore must query
      // compatibility online, UNKNOWN is reported as unavailable and never
      // blocks offline attendance waiting for a network response.
      ArCoreApk.getInstance().checkAvailability(context)
    } catch (error: Exception) {
      return result("UNAVAILABLE", "ERROR", "ARCORE_AVAILABILITY_CHECK_FAILED: ${error.message}")
    }

    if (availability.isUnsupported) {
      return result("UNSUPPORTED", "UNSUPPORTED", "ARCORE_DEVICE_UNSUPPORTED")
    }
    if (availability != ArCoreApk.Availability.SUPPORTED_INSTALLED) {
      val capability = if (availability.isSupported) "SUPPORTED" else "UNAVAILABLE"
      return result(capability, "UNAVAILABLE", "ARCORE_NOT_READY: $availability")
    }

    var session: Session? = null
    try {
      session = Session(context)
      val frontFilter = CameraConfigFilter(session)
        .setFacingDirection(CameraConfig.FacingDirection.FRONT)
      val frontCamera = session.getSupportedCameraConfigs(frontFilter).firstOrNull()
        ?: return result("UNSUPPORTED", "UNSUPPORTED", "ARCORE_FRONT_CAMERA_UNAVAILABLE")

      session.cameraConfig = frontCamera
      val depthSupported = session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)
      if (!depthSupported) {
        return result("UNSUPPORTED", "UNSUPPORTED", "ARCORE_DEPTH_UNSUPPORTED_FOR_DEVICE")
      }

      val depthConfig = session.config
      depthConfig.depthMode = Config.DepthMode.AUTOMATIC
      try {
        session.configure(depthConfig)
      } catch (_: IllegalArgumentException) {
        return result("UNSUPPORTED", "UNSUPPORTED", "ARCORE_DEPTH_UNSUPPORTED_FOR_FRONT_CAMERA")
      }

      // This is only a capability result. No live depth frames have been acquired here,
      // so it must never be interpreted as a liveness pass.
      return result(
        "SUPPORTED",
        "UNAVAILABLE",
        "DEPTH_CAPABLE_BUT_NO_FRONT_CAMERA_DEPTH_FRAMES_WERE_ANALYZED"
      )
    } catch (error: SecurityException) {
      return result("UNAVAILABLE", "UNAVAILABLE", "CAMERA_PERMISSION_REQUIRED")
    } catch (error: Exception) {
      return result("UNAVAILABLE", "ERROR", "ARCORE_FRONT_DEPTH_CHECK_FAILED: ${error.message}")
    } finally {
      try {
        session?.close()
      } catch (_: Exception) {
        // Closing an already-released ARCore session is safe to ignore.
      }
    }
  }

  private fun result(capability: String, status: String, reason: String): Map<String, Any?> = mapOf(
    "capability" to capability,
    "status" to status,
    "cameraFacing" to "front",
    "provider" to "ARCORE_DEPTH_API",
    "reason" to reason,
    "checkedAt" to System.currentTimeMillis()
  )
}
