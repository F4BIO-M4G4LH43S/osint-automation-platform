# 🔍 OSINT Automation Platform

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18-61DAFB.svg)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/react%20native-0.73-61DAFB.svg)](https://reactnative.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg)](https://docker.com)

Enterprise-grade Open Source Intelligence (OSINT) automation platform with web dashboard, mobile apps, and comprehensive security analysis capabilities.

![Platform Overview](docs/images/platform-overview.png)

## ✨ Features

### 🔍 OSINT Capabilities
- **Multi-source Intelligence**: Shodan, VirusTotal, Crt.sh, DNS enumeration, WHOIS
- **WordPress Security**: Specialized scanning for WP vulnerabilities, plugins, themes
- **Attack Surface Mapping**: Visual network graphs, threat timelines, geographic distribution
- **Continuous Monitoring**: Automated scanning with change detection

### 🌓 User Experience
- **Dark Mode**: 4 themes (Light, Dark, Midnight, Ocean) with system preference sync
- **Multi-language**: 11 languages including English, Malay, Indonesian, Arabic (RTL)
- **Responsive Design**: Optimized for desktop, tablet, and mobile browsers

### 🔐 Security
- **Biometric Authentication**: Face ID, Touch ID, fingerprint on mobile
- **Offline Support**: Queue operations, local caching, sync when online
- **JWT Authentication**: Secure API access with refresh tokens

### 📱 Mobile Apps
- **iOS & Android**: Native apps built with React Native
- **Push Notifications**: Real-time alerts for critical findings
- **Offline Mode**: Full functionality without internet connection

## 🚀 Quick Start

### One-Line Installation
```bash
curl -fsSL https://raw.githubusercontent.com/F4BIO-M4G4LH43S/osint-automation-platform/main/install.sh | sudo bash

or

Docker Deployment
bash
Copy

git clone https://github.com/YOUR_USERNAME/osint-automation-platform.git
cd osint-automation-platform
docker-compose up -d

Access:

    Web Dashboard: http://localhost
    API Docs: http://localhost/api/docs
    Mobile: Download from App Store / Play Store

📱 Mobile App Features
Table
Feature	iOS	Android
Biometric Login	Face ID, Touch ID	Fingerprint, Face Unlock
Offline Mode	✅	✅
Push Notifications	✅	✅
Dark Mode	✅	✅
Multiple Languages	✅	✅
🌍 Supported Languages
Table
Language
English	en
Bahasa Melayu	ms
Bahasa Indonesia	id

العربية  ar
中文	zh
日本語	ja
한국어	ko
Español	es
Français	fr
Deutsch	de
Português	pt
🛡️ Security Features

    Data Encryption: At-rest and in-transit encryption
    Biometric Protection: Hardware-backed keystore on mobile
    Audit Logging: Complete activity tracking
    Role-Based Access: Admin, analyst, viewer roles

📊 Visualization Examples
Attack Path Graph
JavaScript
Copy

<AttackGraph data={networkData} width={800} height={600} />

Threat Timeline
JavaScript
Copy

<ThreatTimeline data={threats} onBrush={handleTimeRange} />

🤝 Contributing
We welcome contributions! Please see CONTRIBUTING.md for guidelines.
📄 License
MIT License - see LICENSE file.
🙏 Acknowledgments

    Shodan, VirusTotal, Crt.sh for API access
    React, React Native, FastAPI communities
    Security researchers worldwide
