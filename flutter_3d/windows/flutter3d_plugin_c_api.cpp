#include "include/flutter_3d/flutter3d_plugin_c_api.h"

#include <flutter/plugin_registrar_windows.h>

#include "flutter3d_plugin.h"

void Flutter3dPluginCApiRegisterWithRegistrar(
    FlutterDesktopPluginRegistrarRef registrar) {
  flutter_3d::Flutter3dPlugin::RegisterWithRegistrar(
      flutter::PluginRegistrarManager::GetInstance()
          ->GetRegistrar<flutter::PluginRegistrarWindows>(registrar));
}
