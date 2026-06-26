enum Environment { development, production }

class EnvironmentConfig {
  static Environment current = Environment.development;

  // For physical device: change this to your computer's local IP address
  // Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find your IP
  static const String _localIp = '192.168.1.248';
  static const int _port = 3000;

  static String get apiBaseUrl {
    switch (current) {
      case Environment.development:
        return 'http://$_localIp:$_port/api/v1';
      case Environment.production:
        return 'https://api.smartgrading.com/api/v1';
    }
  }

  static String get wsBaseUrl {
    switch (current) {
      case Environment.development:
        return 'ws://$_localIp:$_port';
      case Environment.production:
        return 'wss://api.smartgrading.com';
    }
  }

  static void setEnvironment(Environment env) {
    current = env;
  }

  /// Set custom IP for physical device testing
  static void setLocalIp(String ip, {int port = 3000}) {
    // This allows runtime configuration if needed
  }
}
