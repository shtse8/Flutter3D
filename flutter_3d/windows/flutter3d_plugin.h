#ifndef FLUTTER_PLUGIN_FLUTTER3D_PLUGIN_H_
#define FLUTTER_PLUGIN_FLUTTER3D_PLUGIN_H_

#include <flutter/method_channel.h>
#include <flutter/plugin_registrar_windows.h>

#include <memory>

namespace flutter_3d {

class Flutter3dPlugin : public flutter::Plugin {
 public:
  static void RegisterWithRegistrar(flutter::PluginRegistrarWindows *registrar);

  Flutter3dPlugin();

  virtual ~Flutter3dPlugin();

  // Disallow copy and assign.
  Flutter3dPlugin(const Flutter3dPlugin&) = delete;
  Flutter3dPlugin& operator=(const Flutter3dPlugin&) = delete;

  // Called when a method is called on this plugin's channel from Dart.
  void HandleMethodCall(
      const flutter::MethodCall<flutter::EncodableValue> &method_call,
      std::unique_ptr<flutter::MethodResult<flutter::EncodableValue>> result);
};

}  // namespace flutter_3d

#endif  // FLUTTER_PLUGIN_FLUTTER3D_PLUGIN_H_
