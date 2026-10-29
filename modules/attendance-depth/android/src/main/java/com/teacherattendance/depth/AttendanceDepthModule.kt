package com.teacherattendance.depth

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
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

    AsyncFunction("isDeveloperOptionsEnabled") {
      isDeveloperOptionsEnabled()
    }

    AsyncFunction("openDeveloperSettings") {
      openDeveloperSettings()
    }
  }

  private fun isDeveloperOptionsEnabled(): Boolean {
    val context = appContext.reactContext ?: return false
    return try {
      val devOptions = Settings.Global.getInt(
        context.contentResolver,
        Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
        0
      ) != 0

      val adb = Settings.Global.getInt(
        context.contentResolver,
        Settings.Global.ADB_ENABLED,
        0
      ) != 0

      devOptions || adb
    } catch (_: Exception) {
      false
    }
  }

  private fun openDeveloperSettings(): Boolean {
    val context = appContext.reactContext ?: return false
    return try {
      val intent = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      true
    } catch (_: Exception) {
      try {
        // Fallback to standard settings if developer settings action fails
        val fallback = Intent(Settings.ACTION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(fallback)
        true
      } catch (_: Exception) {
        false
      }
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
