# Security Policy

## Supported Versions

Only the latest `main` branch of StudyOS is actively supported and patched for security vulnerabilities.

| Version | Supported          |
| ------- | ------------------ |
| Main    | :white_check_mark: |
| < Main  | :x:                |

## Reporting a Vulnerability

We take the security of StudyOS, student data, and platform integrity seriously. If you discover a security vulnerability, **please do not report it publicly via GitHub Issues.**

### Private Reporting Channels
Please report security issues using one of the following methods:
* **GitHub Private Vulnerability Reporting:** Navigate to the **Security** tab of this repository and click **Report a vulnerability**.
* **Email:** Send your report directly to `support.studyos@gmail.com`.

### What to Include in Your Report
To help us triage and respond quickly, please include:
* A description of the vulnerability and its potential impact (e.g., Firestore authorization bypass, sensitive data exposure, API secret leak).
* Clear, step-by-step instructions or a proof-of-concept (PoC) to reproduce the issue.
* The specific affected file(s) or endpoints (e.g., `firestore.rules`, client-side API routes).

### Responsible Disclosure Guidelines
* **Give us time:** Please allow us reasonable time to investigate and patch the issue before making any public disclosure.
* **Respect user data:** Do not attempt to access, modify, or leak data belonging to real students or leaderboard accounts during your research.
* **Scope:** Only test against environments or accounts you own or control. Do not perform Denial of Service (DoS) attacks or automated brute-force testing against production systems.

Thank you for helping keep StudyOS safe for students!