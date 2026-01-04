# 🦅 MAYO TECH SYSTEM CONSTITUTION & SECURITY CODEX
> **CLASSIFICATION:** TOP SECRET // INTERNAL CORE
> **VERSION:** 2.1.0 (THE MOTHER FILE - DEFENSIVE EDITION)
> **STATUS:** IMMUTABLE REFERENCE
> **SCOPE:** GLOBAL (All Applications: Desktop, Web, Mobile)

---

# 📖 PREFACE: THE AI MANDATE

**ATTENTION INTELLIGENT AGENT / SENIOR ENGINEER:**

You are reading the **Constitution of Mayo Tech**. This is not a "readme". This is the **Operating System (OS)** of our software philosophy.

If you are tasked with building a *new* application (e.g., "Mayo ERP", "Mayo CRM", "Mayo Mobile"), you **MUST** follow this document to the letter. This file contains the complete DNA of our security, licensing, and integration logic.

**YOUR OBJECTIVE:**
To build applications that are **Secure by Design**, **Unbreakable by Users**, and **Seamlessly Integrated** with the Central License Authority.

**THE LAW:**
1.  **Uniformity**: All apps must speak the *exact same* dialect to the License Server.
2.  **Paranoia**: Trust nothing from the client (clock, file system, network). Verify everything.
3.  **Resilience**: Apps must function offline for legitimate users, but self-destruct for pirates.
4.  **Elegance**: Security must be invisible to the paying user.

---

# 📑 TABLE OF CONTENTS (THE CODE)

1.  [SECTION I: THE ARCHITECTURE OF TRUST](#section-i-the-architecture-of-trust)
2.  [SECTION II: THE CENTRAL SERVER SPECIFICATIONS (API BIBLE)](#section-ii-the-central-server-specifications-api-bible)
3.  [SECTION III: CRYPTOGRAPHIC STANDARDS & KEY MANAGEMENT](#section-iii-cryptographic-standards--key-management)
4.  [SECTION IV: THE HARDWARE IDENTITY (FINGERPRINTING)](#section-iv-the-hardware-identity-fingerprinting)
5.  [SECTION V: THE INTEGRATION BLUEPRINT (STEP-BY-STEP BUILD GUIDE)](#section-v-the-integration-blueprint-step-by-step-build-guide)
6.  [SECTION VI: THE STATE MACHINE (APP LIFECYCLE)](#section-vi-the-state-machine-app-lifecycle)
7.  [SECTION VII: OFFENSIVE DEFENSE (ANTI-TAMPER)](#section-vii-offensive-defense-anti-tamper)
8.  [SECTION VIII: THE ROSETTA STONE (ERROR MAPPING)](#section-viii-the-rosetta-stone-error-mapping)
9.  [SECTION IX: DEPLOYMENT & PRODUCTION CHECKLIST](#section-ix-deployment--production-checklist)
10. [SECTION X: SOURCE CODE HARDENING (BYTENODE)](#section-x-source-code-hardening-bytenode)

---

# SECTION I: THE ARCHITECTURE OF TRUST

We operate on a **Hybrid-Secure Model**. This means we combine the strictness of online banking with the flexibility of desktop software.

### 1. The Trinity of Entities

*   **THE AUTHORITY (License Server)**: 
    *   **Role**: The Supreme Judge.
    *   **Capabilities**: Holds the `RSA-2048 Private Key`. Issues immutable, signed verdicts (Licenses).
    *   **Behavior**: Stateless, strict, uncompromising.
    *   **URL**: `https://license-server.mayo-tech.com` (Example - Must be configured via Env)

*   **THE SUBJECT (Client Application)**
    *   **Role**: The Enforcer.
    *   **Capabilities**: Holds the `RSA Public Key`. Verifies verdicts. Executes business logic.
    *   **Behavior**: Paranoid. Checks its own integrity and the user's environment constantly.

*   **THE VAULT (Secure Storage)**
    *   **Role**: The Safe.
    *   **Technology**: System Keyring (Windows Credential Manager / macOS Keychain).
    *   **Method**: `node-keytar` (Desktop), `EncryptedSharedPreferences` (Android), `Keychain` (iOS).
    *   **Data**: `ActivationKey` (Raw), `SignedLicense` (JSON+Sig), `MachineID` (Salted).

---

# SECTION II: THE CENTRAL SERVER SPECIFICATIONS (API BIBLE)

**PROTOCOL VERSION**: 1.1
**CONTENT TYPE**: `application/json`

### 2.1 The Activation Endpoint (`POST /api/license/activate`)
**Trigger**: First time startup, or after deactivation.

**REQUEST BODY (The Application Sends):**
```jsonc
{
  "deviceId": "STRING_MIN_16_CHARS", // The Calculated Hardware Fingerprint
  "activationKey": "STRING_FORMAT_MAYO-XXXX", // The User Input
  "productCode": "STRING_CONST", // e.g. "MAYO_ATTENDANCE_V1", "MAYO_ERP_V1"
  "hardwareComponents": { // OPTIONAL TELEMETRY
    "cpu": "Intel Core i9-14900K",
    "disk": "Samsung SSD 990 PRO",
    "mac": "00:1A:2B:3C:4D:5E",
    // All other optional fields allowed
  }
}
```

**RESPONSE BODY (The Server Returns):**
```jsonc
{
  "success": true,
  "license": {
    "payload": {
      "deviceId": "MATCHING_DEVICE_ID",
      "productCode": "MATCHING_PRODUCT_CODE",
      "validFrom": "ISO_DATE_STRING",
      "validTo": "ISO_DATE_STRING", // OR null for LIFETIME
      "licenseType": "monthly" | "yearly" | "lifetime",
      "issuedAt": "ISO_DATE_STRING",
      "customerId": "UUID_OPTIONAL",
      "customerEmail": "EMAIL_OPTIONAL"
    },
    // CRITICAL: Base64 string of RSA-SHA256 signature of JSON.stringify(payload)
    "signature": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8..." 
  }
}
```

### 2.2 The Renewal Endpoint (`POST /api/license/renew`)
**Trigger**: Auto-renewal check (Startup), or User Manual Click.
**Philosophy**: Stateless. No token required. Authentication via Key+Device combination.

**REQUEST BODY:**
```jsonc
{
  "deviceId": "SAME_DEVICE_ID",
  "activationKey": "SAME_ACTIVATION_KEY", 
  "productCode": "SAME_PRODUCT_CODE"
}
```

**RESPONSE BODY:**
```jsonc
{
  "success": true,
  "license": { ... }, // New Signed License Object with updated validTo
  "message": "Renewed successfully"
}
```

### 2.3 The Deactivation Endpoint (`POST /api/license/deactivate`)
**Trigger**: User wants to move license to another PC.

**REQUEST BODY:** (Identical to Renewal)
```jsonc
{
  "deviceId": "...",
  "activationKey": "...",
  "productCode": "..."
}
```

### 2.4 The Status Check Endpoint (`POST /api/license/check`)
**Trigger**: Background heartbeat (Silent).

**REQUEST BODY:** (Identical to Renewal)

---

# SECTION III: CRYPTOGRAPHIC STANDARDS & KEY MANAGEMENT

**VIOLATION OF THIS SECTION IS A CRITICAL SECURITY FAILURE.**

### 3.1 Asymmetric Algorithm (Server Trust)
*   **Algo**: `RSA` (Rivest–Shamir–Adleman)
*   **Key Size**: `2048 bit` (Minimum) or `4096 bit` (Preferred).
*   **Hash Function**: `SHA-256`.
*   **Padding**: `PKCS#1 v1.5`.

### 3.2 Verification Logic (Client Side)
Every application MUST implement this *exact* function signature to verify the server's response.

```javascript
/* 
 * VERIFICATION ALGORITHM (PSEUDO-CODE)
 * 1. Receive JSON object `license` from server.
 * 2. Extract `license.payload` and `license.signature`.
 * 3. Serialize `payload` using standard JSON.stringify().
 *    WARNING: Do not sort keys. Do not use 'canonical-json'. 
 *    Match Server's serialization exactly.
 * 4. Verify signature using Public Key.
 */

const dataToVerify = JSON.stringify(receivedLicense.payload);
const isAuthentic = crypto.verify(
    "sha256", 
    Buffer.from(dataToVerify), 
    PublicKey_PEM, 
    Buffer.from(receivedLicense.signature, "base64")
);
```

### 3.3 Symmetric Algorithm (Local Storage)
*   **Algo**: `AES-256-GCM` (Authenticated Encryption).
*   **Key Derivation**: `scrypt` (N=16384, r=8, p=1).
*   **Salt**: Unique per machine (e.g., hash of MachineID).
*   **Application**: Encrypting the `activationKey` before saving to disk/DB if `keytar` is unavailable.

### 3.4 Emergency Key Rotation Protocol
**Problem**: The Private Key on the Vercel/Cloud server is compromised.
**Strategy**:
1.  **Endpoint**: The app must query `/api/config/keys` (Open endpoint) periodically or upon consistent `KEY_REVOKED` errors.
2.  **Verification**: The new key provided by this endpoint MUST be signed by the *old* key, or verified via a secondary rigid channel (e.g., DNS TXT record or Firebase Remote Config).
3.  **Action**: If a new Public Key is detected and verified, the Client silently swaps `process.env.LICENSE_PUBLIC_KEY` in memory/storage and re-validates the license.

---

# SECTION IV: THE HARDWARE IDENTITY (FINGERPRINTING)

To prevent "Copy-Paste" piracy, the license is bound to the physical atomic structure of the Machine.

### 4.1 The 12-Factor Fingerprint
You must generate a `deviceId` derived from a weighted hash of the following components. 

**WEIGHT DISTRIBUTION:**

| Component | Weight | Stability | Notes |
|-----------|--------|-----------|-------|
| `Disk Serial` (Boot) | 30% | High | The ID of the C: drive physical hardware |
| `Motherboard Serial` | 25% | High | BIOS/Baseboard Serial |
| `CPU Processor ID` | 20% | High | CPUID Instruction result |
| `Machine GUID` | 15% | Medium | OS Registry / IOPlatformUUID |
| `MAC Address` | 10% | Low | Primary Interface Only (Ignore Virtual/VPN) |

### 4.2 The "Fuzzy Match" Algorithm
Hardware changes. A user might replace a NIC or upgrade RAM.
*   **Logic**: Compare *current* components vs *stored* components. if `Match_Score >= 0.8` (80%), trust the device.

### 4.3 VM Detection Logic (The Ghostbuster)
Hackers use VMs to manipulate clocks and network states easily.

**Logic (systeminformation lib):**
```typescript
const isVirtual = (await si.system()).virtual || (await si.osInfo()).hypervizor;
const manufacturer = (await si.system()).manufacturer.toLowerCase();
if (manufacturer.includes('vmware') || manufacturer.includes('virtualbox')) {
  // FLAG DETECTED
}
```
**Policy:**
*   **High Risk App**: BLOCK startup immediately. "Virtual Machines are not supported."
*   **Standard App**: Mark license as `RISK_LEVEL_HIGH`. Force `Online Check` on *every* startup. Disable Offline Mode.

---

# SECTION V: THE INTEGRATION BLUEPRINT (STEP-BY-STEP BUILD GUIDE)

**FOR THE AI BUILDER:** Follow this execution path to create a new client.

### PHASE 1: SCAFFOLDING & DEPENDENCIES
1.  **Install Core Libs**:
    *   `axios` (Networking)
    *   `keytar` (Secure Storage - native binding required)
    *   `systeminformation` (Hardware info)
    *   `crypto` (Built-in Node)
    *   `bytenode` (For Source Hardening - See Section X)

2.  **Environment Setup**:
    *   Create `.env`
    *   Define `LICENSE_SERVER_URL`
    *   Define `PRODUCT_CODE` (Must match Server DB)
    *   Define `LICENSE_PUBLIC_KEY` (The PEM string)

### PHASE 2: THE LICENSE MODULE STRUCTURE
Create a dedicated directory `src/license` with these files:

1.  `types.ts`: Define `LicensePayload`, `SignedLicense`, `ServerResponse`.
2.  `config.ts`: Export constants (`PRODUCT_CODE`, `GRACE_PERIOD_DAYS = 7`).
3.  `fingerprint.ts`: Logic to gather `systeminformation` and generate `deviceId`.
4.  `storage.ts`: Wrappers for `keytar` (`saveLicense`, `getLicense`, `clearLicense`).
5.  `network.ts`: Axios instance with interceptors and error handling.
6.  **`manager.ts` (THE BRAIN)**: usage of all above.
    *   `checkLicense()` method (Called on App Start).
    *   `activate(key)` method.
    *   `renew()` method.

---

# SECTION VI: THE STATE MACHINE (APP LIFECYCLE)

The application can only be in one of these states regarding licensing.

1.  **UNACTIVATED (Null State)**: Clean install. Blocked.
2.  **ACTIVE (Green State)**: Valid license. Allowed.
3.  **GRACE PERIOD (Yellow State)**: Expired but within 7 days. Allowed + Warning.
4.  **EXPIRED (Red State)**: Fully expired. Blocked.
5.  **OFFLINE BLOCKED (Orange State)**: Offline too long. Blocked.
6.  **TAMPERED (Black State)**: Signature or Time check failed. Blocked + Alert.

---

# SECTION VII: OFFENSIVE DEFENSE (ANTI-TAMPER)

### 7.1 Time Travel Prevention
Users change system clocks to 1990 or 2050 to bypass checks.
**Counter-Measure:**
1.  Store `last_run_timestamp` in Secure Storage.
2.  On boot: `if (SystemTime < last_run_timestamp) { FLAG_TAMPERING(); }`

### 7.2 The "Clone" Attack
**Counter-Measure:** `deviceId` calculation (Section IV) prevents license copying.

### 7.3 The Console Firewall (DevTools Blockade)
**Problem**: Users can open DevTools (Ctrl+Shift+I) and edit `isLicensed = true` in memory.
**Solution**:
1.  **Disable Shortcuts**: Intercept `CommandOrControl+Shift+I`, `F12`, `CommandOrControl+R` in Main Process.
2.  **Production Mode**:
    ```typescript
    if (app.isPackaged) {
      mainWindow.webContents.on('devtools-opened', () => {
        mainWindow.webContents.closeDevTools(); // Aggressive Close
      });
      // Disable Context Menu
      mainWindow.hookWindowMessage(278, () => 1); // Windows specific hack or use 'context-menu' event prevention
    }
    ```

---

# SECTION VIII: THE ROSETTA STONE (ERROR MAPPING)

**MANDATORY:** You must map these raw server errors to the exact Arabic strings defined below.

| Server Error (Raw) | Analysis | Arabic UI Message |
|--------------------|----------|-------------------|
| `Invalid activation key` | Key does not exist in DB | ❌ مفتاح التفعيل غير صحيح |
| `License is already bound to a different device` | Key active elsewhere | 🚫 المفتاح مستخدم مسبقاً على جهاز آخر |
| `License is not bound to this device` | Deactivation requested by wrong PC | ⚠️ الرخصة غير مفعلة على هذا الجهاز |
| `License has expired` | Date check failed on server | ⏳ انتهت صلاحية مفتاح التفعيل |
| `License has been suspended` | Manual Ban by Admin | 🛑 تم إيقاف مفتاح التفعيل من قبل الإدارة |
| `Lifetime licenses do not need renewal` | Logic error in client | ✅ الرخص الدائمة لا تحتاج لتجديد |
| `Invalid product code` | Key format valid, but for wrong App | 📦 مفتاح التفعيل لمنتج مختلف |

---

# SECTION IX: DEPLOYMENT & PRODUCTION CHECKLIST

Before shipping ANY version (`v1.0.0`):

*   [ ] **Env Check**: Is `LICENSE_SERVER_URL` pointing to Production?
*   [ ] **Key Check**: Is `LICENSE_PUBLIC_KEY` the Production Key?
*   [ ] **Bytecode**: Is `license.JSC` compiled? (See Section X)
*   [ ] **ASAR**: Is the app packaged in ASAR?
*   [ ] **Logging**: Is `console.log` stripped?

---

# SECTION X: SOURCE CODE HARDENING (BYTENODE)

**PROBLEM**: 
Electron ships JS files as text inside `app.asar`. A simple command `asar extract app.asar` reveals the entire source code. Obfuscation is merely a speedbump, not a wall.

**SOLUTION**: 
**V8 Bytecode Compilation (`bytenode`)**.

**IMPLEMENTATION PROTOCOL:**
1.  **Logic Separation**: Isolate the `LicenseManager`, `Network`, and `DeviceFingerprint` logic into a separate build target.
2.  **Compilation Step**: During `npm run build`:
    ```bash
    bytenode --compile dist/electron/license/manager.js
    # Output: dist/electron/license/manager.jsc
    ```
3.  **Loading Mechanism**:
    The Main Process entry point (`main.ts`) MUST load the binary:
    ```typescript
    require('bytenode');
    const LicenseManager = require('./license/manager.jsc');
    ```
4.  **Cleanup**: Delete the original `.js` source files from the `dist` folder before packaging.

**WHY?**: 
`.jsc` files are binary V8 snapshots. They contain no source code. Reverse engineering them requires deep knowledge of V8 internals and is orders of magnitude harder than reading obfuscated JS.

---

> **SIGNED & SEALED**
> **MAYO TECH SYSTEM ARCHITECT**
> *Trust No One. Verify Everything.*
