// Stub implementation for non-web platforms.
import 'package:web/web.dart'
    if (dart.library.io) '../stub/web_stub.dart'
    as web;

/// Stub class for Flutter3dWeb. Throws errors if used on non-web platforms.
class Flutter3dWeb {
  Flutter3dWeb() {
    throw UnimplementedError('Flutter3dWeb is only available on web.');
  }

  Future<bool> initializeWebGPU() async {
    throw UnimplementedError('initializeWebGPU is only available on web.');
  }

  bool configureCanvas(web.HTMLCanvasElement canvas) {
    throw UnimplementedError('configureCanvas is only available on web.');
  }

  void callRenderFrame() {
    throw UnimplementedError('callRenderFrame is only available on web.');
  }
}
