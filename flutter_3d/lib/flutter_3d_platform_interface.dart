import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import 'flutter_3d_method_channel.dart';

abstract class Flutter3dPlatform extends PlatformInterface {
  /// Constructs a Flutter3dPlatform.
  Flutter3dPlatform() : super(token: _token);

  static final Object _token = Object();

  static Flutter3dPlatform _instance = MethodChannelFlutter3d();

  /// The default instance of [Flutter3dPlatform] to use.
  ///
  /// Defaults to [MethodChannelFlutter3d].
  static Flutter3dPlatform get instance => _instance;

  /// Platform-specific implementations should set this with their own
  /// platform-specific class that extends [Flutter3dPlatform] when
  /// they register themselves.
  static set instance(Flutter3dPlatform instance) {
    PlatformInterface.verifyToken(instance, _token);
    _instance = instance;
  }

  Future<String?> getPlatformVersion() {
    throw UnimplementedError('platformVersion() has not been implemented.');
  }
}
