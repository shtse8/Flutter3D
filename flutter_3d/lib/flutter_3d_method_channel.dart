import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'flutter_3d_platform_interface.dart';

/// An implementation of [Flutter3dPlatform] that uses method channels.
class MethodChannelFlutter3d extends Flutter3dPlatform {
  /// The method channel used to interact with the native platform.
  @visibleForTesting
  final methodChannel = const MethodChannel('flutter_3d');

  @override
  Future<String?> getPlatformVersion() async {
    final version = await methodChannel.invokeMethod<String>('getPlatformVersion');
    return version;
  }
}
