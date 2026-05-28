#!/usr/bin/env python3
"""Generate enterprise Draw.io architecture diagrams for ThumbsUpApp."""
import html
import os
import uuid

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "architecture")


def esc(text):
    return html.escape(str(text), quote=True)


class DrawioBuilder:
    def __init__(self, page_w=3200, page_h=2400):
        self.page_w = page_w
        self.page_h = page_h
        self.cells = []
        self._id = 2

    def nid(self):
        self._id += 1
        return str(self._id)

    def root(self):
        return [
            '<mxCell id="0"/>',
            '<mxCell id="1" parent="0"/>',
        ]

    def rect(
        self,
        x,
        y,
        w,
        h,
        label,
        parent="1",
        fill="#ffffff",
        stroke="#333333",
        font_size=11,
        rounded=1,
        dashed=0,
        align="left",
        vertical_align="top",
        spacing_left=8,
        spacing_top=6,
        bold=False,
        white_space="wrap",
    ):
        cid = self.nid()
        fs = ";fontStyle=1" if bold else ""
        dash = ";dashed=1;dashPattern=8 8" if dashed else ""
        style = (
            f"rounded={rounded};whiteSpace={white_space};html=1;fillColor={fill};strokeColor={stroke};"
            f"align={align};verticalAlign={vertical_align};spacingLeft={spacing_left};spacingTop={spacing_top};"
            f"fontSize={font_size}{fs}{dash}"
        )
        self.cells.append(
            f'<mxCell id="{cid}" value="{esc(label)}" style="{style}" vertex="1" parent="{parent}">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        return cid

    def swimlane(self, x, y, w, h, title, fill="#dae8fc", stroke="#6c8ebf"):
        cid = self.nid()
        style = (
            f"swimlane;horizontal=0;startSize=32;fillColor={fill};strokeColor={stroke};"
            "fontStyle=1;fontSize=13;html=1;whiteSpace=wrap;"
        )
        self.cells.append(
            f'<mxCell id="{cid}" value="{esc(title)}" style="{style}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        return cid

    def edge(self, src, tgt, label="", color="#333333", dashed=0, parent="1"):
        eid = self.nid()
        dash = ";dashed=1" if dashed else ""
        style = (
            f"edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;"
            f"strokeColor={color};fontSize=10;endArrow=block;endFill=1{dash}"
        )
        lbl = f' value="{esc(label)}"' if label else ""
        self.cells.append(
            f'<mxCell id="{eid}"{lbl} style="{style}" edge="1" parent="{parent}" source="{src}" target="{tgt}">'
            f'<mxGeometry relative="1" as="geometry"/></mxCell>'
        )
        return eid

    def ellipse(self, x, y, w, h, label, fill, stroke, parent="1"):
        cid = self.nid()
        style = f"ellipse;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontSize=11;"
        self.cells.append(
            f'<mxCell id="{cid}" value="{esc(label)}" style="{style}" vertex="1" parent="{parent}">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>'
        )
        return cid

    def build_page(self, name, diagram_id=None):
        diagram_id = diagram_id or str(uuid.uuid4())
        body = "\n        ".join(self.root() + self.cells)
        return f"""  <diagram id="{diagram_id}" name="{esc(name)}">
    <mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{self.page_w}" pageHeight="{self.page_h}" math="0" shadow="0">
      <root>
        {body}
      </root>
    </mxGraphModel>
  </diagram>"""

    def build_file(self, title, pages):
        pages_xml = "\n".join(pages)
        return f"""<mxfile host="app.diagrams.net" modified="2026-05-28T00:00:00.000Z" agent="ThumbsUpApp Architecture Generator" version="22.1.0" type="device">
{pages_xml}
</mxfile>"""


def build_auth_diagram():
    b = DrawioBuilder(3400, 2800)
    G, Y, R = "#d5e8d4", "#fff2cc", "#f8cecc"
    GS, YS, RS = "#82b366", "#d6b656", "#b85450"

    b.rect(20, 20, 3360, 50, "ThumbsUpApp — User Enrollment & Authentication Architecture", bold=True, font_size=18, fill="#f5f5f5", align="center")
    b.rect(20, 78, 3360, 36, "Legend: GREEN = trusted | YELLOW = verification required | RED = blocked/fraud | Solid = implemented (POST /login) | Dashed = enterprise target (/auth/*, schema-ready tables)", fill="#eeeeee", font_size=10)

    # Trust boundaries
    tb1 = b.rect(40, 130, 1580, 1250, "TRUST BOUNDARY — Public Internet / Client Zone", dashed=1, fill="#fff9e6", stroke="#d6b656")
    tb2 = b.rect(1640, 130, 1720, 1250, "TRUST BOUNDARY — Application Tier (Render / Express)", dashed=1, fill="#e8f4fc", stroke="#6c8ebf")
    tb3 = b.rect(40, 1400, 3320, 680, "TRUST BOUNDARY — Data Tier (MySQL)", dashed=1, fill="#f0f0f0", stroke="#666666")

    # Client swimlane
    sl_fe = b.swimlane(60, 160, 300, 1180, "React PWA Frontend", "#dae8fc", "#6c8ebf")
    fe_reg = b.rect(20, 50, 260, 120, "Registration UI\nPOST /auth/register (target)\nPayload: username, email, phone, password, deviceSignals", parent=sl_fe, fill=G, stroke=GS, dashed=1)
    fe_login = b.rect(20, 190, 260, 130, "Login UI\nPOST /login (implemented)\nPayload: { username, password }\nStores JWT in localStorage", parent=sl_fe, fill=G, stroke=GS)
    fe_refresh = b.rect(20, 340, 260, 90, "Token Refresh\nPOST /auth/refresh (target)\nPayload: { refreshToken }", parent=sl_fe, fill=Y, stroke=YS, dashed=1)
    fe_session = b.rect(20, 450, 260, 90, "Session Guard\nGET /session/validate (target)\nHeader: Bearer JWT", parent=sl_fe, fill=Y, stroke=YS, dashed=1)
    fe_fp = b.rect(20, 560, 260, 110, "Device Fingerprint Engine\nlib/deviceFingerprint.js\nHeader: X-Device-Fingerprint", parent=sl_fe, fill=G, stroke=GS)
    fe_pay = b.rect(20, 690, 260, 100, "Payment / Risk calls\nPOST /risk/analyze\nX-Device-Fingerprint + Bearer", parent=sl_fe, fill=G, stroke=GS)
    fe_rbac = b.rect(20, 810, 260, 90, "RBAC UI gates\nrole: admin | distributor | user", parent=sl_fe, fill=G, stroke=GS)
    fe_logout = b.rect(20, 920, 260, 70, "POST /logout\nClears local JWT", parent=sl_fe, fill=G, stroke=GS)

    # API Gateway
    sl_api = b.swimlane(380, 160, 360, 1180, "Express API Gateway", "#e1d5e7", "#9673a6")
    api_reg = b.rect(20, 50, 320, 100, "/auth/register (target)\nHelmet → CORS → JSON → rateLimit → inputGuard → registerHandler", parent=sl_api, fill=Y, stroke=YS, dashed=1)
    api_login = b.rect(20, 170, 320, 120, "POST /login\nenterpriseLimiter.login → asyncHandler\nNo originGuard (core mount)", parent=sl_api, fill=G, stroke=GS)
    api_refresh = b.rect(20, 310, 320, 80, "/auth/refresh (target)\nRotate JWT + session row", parent=sl_api, fill=Y, stroke=YS, dashed=1)
    api_session = b.rect(20, 410, 320, 80, "GET /session/validate (target)\nverifyToken → session lookup", parent=sl_api, fill=Y, stroke=YS, dashed=1)
    api_risk = b.rect(20, 510, 320, 100, "POST /risk/analyze\nmount: /risk + originGuard\nverifyToken → loadAuthUser → riskAnalyzeLimiter", parent=sl_api, fill=G, stroke=GS)
    api_core = b.rect(20, 630, 320, 140, "Protected DMS routes\nverifyToken on /products, /customers, /sales\nJWT claims: id, username, role", parent=sl_api, fill=G, stroke=GS)
    api_logout = b.rect(20, 790, 320, 70, "POST /logout\nverifyToken (stateless)", parent=sl_api, fill=G, stroke=GS)

    # Middleware
    sl_mw = b.swimlane(760, 160, 400, 1180, "Security Middleware Layer", "#f8cecc", "#b85450")
    mw_order = b.rect(20, 50, 360, 200, "Execution order (payments mount):\n1. httpsEnforce + HSTS\n2. requestContext (IP, UA, X-Device-Fingerprint)\n3. inputSanitizer (SQLi patterns)\n4. originGuard (CSRF-style Origin/Referer)\n5. verifyToken (JWT HS256)\n6. loadAuthUser (DB reload)\n7. role / rate limiters", parent=sl_mw, fill="#ffffff", stroke="#b85450")
    mw_jwt = b.rect(20, 270, 360, 90, "JWT validation\nSECRET, exp JWT_EXPIRES_IN\n403 missing / 401 invalid", parent=sl_mw, fill=G, stroke=GS)
    mw_rl = b.rect(20, 380, 360, 100, "Rate limiting\nenterpriseLimiter: IP/user/device/burst\nLogs suspicious_activities on exceed", parent=sl_mw, fill=G, stroke=GS)
    mw_sql = b.rect(20, 500, 360, 80, "SQL injection protection\ninputGuard + parameterized queries\nsafeQuery wrapper", parent=sl_mw, fill=G, stroke=GS)
    mw_csrf = b.rect(20, 600, 360, 80, "CSRF / Origin protection\noriginGuard allowlist (non-GET)\nJWT + credentials CORS", parent=sl_mw, fill=G, stroke=GS)
    mw_geo = b.rect(20, 700, 360, 100, "Geo/IP anomaly (payments)\ndeviceTrustService impossible_travel\nsecurity_incidents", parent=sl_mw, fill=Y, stroke=YS)
    mw_replay = b.rect(20, 820, 360, 80, "Replay prevention\nwebhook_replay_guard (webhooks)\nIdempotency keys (orders)", parent=sl_mw, fill=G, stroke=GS)
    mw_timeout = b.rect(20, 920, 360, 80, "Session timeout\nadminSessionTimeout (admin JWT iat)\nJWT exp for all clients", parent=sl_mw, fill=Y, stroke=YS)

    # Services
    sl_svc = b.swimlane(1180, 160, 420, 1180, "Auth & Risk Services", "#d5e8d4", "#82b366")
    svc_auth = b.rect(20, 50, 380, 130, "Auth Service (server.js)\nbcrypt verify + legacy upgrade\nblocked: banned/suspended/deleted\nisUsernameDisabled check", parent=sl_svc, fill=G, stroke=GS)
    svc_device = b.rect(20, 200, 380, 150, "Device Trust Engine\ndeviceTrustService.js\nblocked_devices, device_sessions\ntrustScore, emulator/headless flags", parent=sl_svc, fill=G, stroke=GS)
    svc_risk = b.rect(20, 370, 380, 160, "Risk Engine V2 (login-adjacent)\nriskEngineV2 + riskOrchestrator\nblocked_entities checks\nvelocity, multi-account device", parent=sl_svc, fill=G, stroke=GS)
    svc_fraud_login = b.rect(20, 550, 380, 120, "Fraud on Login (target)\nFailed attempt tracking → suspicious_activities\nOptional POST /risk/analyze pre-auth", parent=sl_svc, fill=R, stroke=RS, dashed=1)
    svc_audit = b.rect(20, 690, 380, 100, "Audit Logging\napi_request_logs, admin_audit_logs\nsuspicious_activities inserts", parent=sl_svc, fill=G, stroke=GS)
    svc_rbac = b.rect(20, 810, 380, 100, "RBAC\nrequireRole(admin) on /admin/*\nJWT role claim + DB users.role", parent=sl_svc, fill=G, stroke=GS)
    svc_session = b.rect(20, 930, 380, 100, "Session Store (schema-ready)\nuser_sessions, trusted_devices\nSHA-256 session_token_hash", parent=sl_svc, fill=Y, stroke=YS, dashed=1)

    # Sequence column
    sl_seq = b.swimlane(1680, 160, 640, 1180, "Authentication Sequence Flows", "#ffffff", "#333333")
    seq_login = b.rect(20, 50, 600, 280, "LOGIN FLOW (implemented)\n1. Client POST /login {username,password}\n2. loginLimiter (enterpriseLimiter)\n3. SELECT users — status, is_active, deleted_at\n4. bcrypt verify / legacy hash upgrade\n5. jwt.sign({id,username,role}, exp)\n6. Response {success, token}\nSecurity: rate limit, account status, no user enumeration timing", parent=sl_seq, fill=G, stroke=GS)
    seq_reg = b.rect(20, 350, 600, 200, "REGISTRATION FLOW (target enterprise)\n1. POST /auth/register + deviceSignals\n2. Validate email/phone uniqueness\n3. bcrypt hash password, INSERT users\n4. INSERT user_sessions + trusted_devices\n5. Issue JWT + refresh token\nTables: users, user_sessions, trusted_devices", parent=sl_seq, fill=Y, stroke=YS, dashed=1)
    seq_val = b.rect(20, 570, 600, 180, "SESSION VALIDATION (target)\n1. GET /session/validate Bearer JWT\n2. verifyToken → load session hash\n3. Check expires_at, is_active\n4. Device fingerprint match\n5. 200 {valid, user, session} | 401", parent=sl_seq, fill=Y, stroke=YS, dashed=1)
    seq_risk = b.rect(20, 770, 600, 200, "RISK AT AUTH (payment path)\nPOST /risk/analyze {amount, customerId?}\n→ fraudEngine.analyzePaymentRisk\n→ deviceTrustService.evaluateDeviceTrust\nTables: blocked_*, user_risk_scores, suspicious_activities", parent=sl_seq, fill=G, stroke=GS)
    seq_block = b.rect(20, 990, 600, 120, "BLOCKED FLOW (red path)\nblocked_entities / banned status\n→ 403 Invalid credentials OR PaymentBlockedError\n→ suspicious_activities + security_incidents", parent=sl_seq, fill=R, stroke=RS)

    # DB layer
    db_users = b.rect(80, 1430, 400, 200, "users\nid, username, password, email, phone\nrole, status, is_active, deleted_at", fill=G, stroke=GS)
    db_sessions = b.rect(520, 1430, 400, 200, "user_sessions (schema-ready)\nsession_token_hash, device_fingerprint\nexpires_at, last_seen_at", fill=Y, stroke=YS, dashed=1)
    db_trusted = b.rect(960, 1430, 400, 200, "trusted_devices (schema-ready)\nuser_id + device_fingerprint\nbrowser_hash, os_name, timezone", fill=Y, stroke=YS, dashed=1)
    db_blocked = b.rect(1400, 1430, 400, 200, "blocked_entities\nentity_type: user|device|ip|customer\nChecked at login (target) + risk", fill=R, stroke=RS)
    db_susp = b.rect(1840, 1430, 400, 200, "suspicious_activities\nactivity_type, severity, risk_score\nrate-limit + fraud alerts", fill=Y, stroke=YS)
    db_device = b.rect(2280, 1430, 400, 200, "device_sessions, blocked_devices\nemulator, headless, trust_score\nimpossible_travel incidents", fill=G, stroke=GS)
    db_audit = b.rect(2720, 1430, 400, 200, "api_request_logs, admin_audit_logs\nsecurity_incidents, user_risk_scores", fill=G, stroke=GS)

    b.edge(fe_login, api_login, "HTTPS", GS)
    b.edge(api_login, mw_rl, "", GS)
    b.edge(mw_rl, svc_auth, "", GS)
    b.edge(svc_auth, db_users, "SELECT/UPDATE", GS)
    b.edge(fe_fp, svc_device, "X-Device-Fingerprint", GS)
    b.edge(fe_pay, api_risk, "Bearer", GS)
    b.edge(api_risk, svc_risk, "", GS)
    b.edge(svc_risk, db_blocked, "check", RS, dashed=1)

    page1 = b.build_page("Enrollment & Auth Flow")
    b2 = DrawioBuilder(2800, 2000)
    b2.rect(20, 20, 2760, 40, "JWT Token Lifecycle & RBAC Component View", bold=True, font_size=16, fill="#f5f5f5", align="center")
    jwt1 = b2.rect(80, 100, 500, 320, "JWT Lifecycle\n• Issue: jwt.sign on login (1h default)\n• Store: localStorage (frontend)\n• Transmit: Authorization Bearer\n• Verify: verifyToken middleware\n• Refresh: POST /auth/refresh (target)\n• Revoke: stateless logout (client discard)\n• Admin: adminSessionTimeout checks iat", fill=G, stroke=GS)
    jwt2 = b2.rect(640, 100, 500, 320, "RBAC Matrix\nadmin → /admin/*, refunds\nuser → own payments\nJWT payload + loadAuthUser DB role\nrequireRole('admin') guard", fill=G, stroke=GS)
    jwt3 = b2.rect(1200, 100, 500, 320, "Fraud Detection — Login\n• Disabled username list\n• Account status banned/suspended\n• Rate limit brute force\n• (Target) device fingerprint mismatch\n• (Target) geo velocity on session", fill=Y, stroke=YS)
    jwt4 = b2.rect(1760, 100, 500, 320, "Blocked / Fraudulent Path\n• blocked_entities hit → block\n• Risk score ≥ critical → deny\n• Multiple accounts per device\n• Replay / duplicate session", fill=R, stroke=RS)

    return b.build_file("Auth Architecture", [page1, b2.build_page("JWT & RBAC")])


def build_payment_diagram():
    b = DrawioBuilder(3600, 3000)
    G, Y, R = "#d5e8d4", "#fff2cc", "#f8cecc"
    GS, YS, RS = "#82b366", "#d6b656", "#b85450"

    b.rect(20, 20, 3560, 50, "ThumbsUpApp — Real-Time UPI Payment Architecture (Razorpay)", bold=True, font_size=18, fill="#f5f5f5", align="center")

    # State machine row
    states = ["CREATED", "INITIATED", "PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED", "BLOCKED", "FLAGGED_FOR_REVIEW"]
    x0 = 60
    for i, st in enumerate(states):
        fill = G if st in ("SUCCESS", "INITIATED", "CREATED") else Y if st in ("PENDING", "PROCESSING", "FLAGGED_FOR_REVIEW") else R if st in ("FAILED", "BLOCKED", "CANCELLED") else "#e1d5e7"
        stroke = GS if fill == G else YS if fill == Y else RS if fill == R else "#9673a6"
        b.rect(x0 + i * 340, 90, 300, 50, st, fill=fill, stroke=stroke, align="center", bold=True, font_size=10)

    sl_fe = b.swimlane(40, 170, 340, 1400, "React PWA + Socket.IO Client", "#dae8fc", "#6c8ebf")
    b.rect(20, 50, 300, 100, "PaymentModal / paymentService.js\nRazorpay Checkout.js UPI Intent/QR/Collect", parent=sl_fe, fill=G, stroke=GS)
    b.rect(20, 170, 300, 90, "POST /payments/create-order\n{idempotencyKey, customerId, amount, gstPaise}", parent=sl_fe, fill=G, stroke=GS)
    b.rect(20, 280, 300, 90, "POST /payments/verify\n{orderUuid, razorpayOrderId, razorpayPaymentId, signature}", parent=sl_fe, fill=G, stroke=GS)
    b.rect(20, 390, 300, 80, "GET /payments/status/:id\nPoll order + transaction", parent=sl_fe, fill=G, stroke=GS)
    b.rect(20, 490, 300, 80, "usePaymentSocket.js\nListen: payment:update", parent=sl_fe, fill=G, stroke=GS)
    b.rect(20, 590, 300, 80, "POST /risk/analyze\nPre-payment risk check", parent=sl_fe, fill=Y, stroke=YS)
    b.rect(20, 690, 300, 100, "Offline PWA queue\nRetry when online", parent=sl_fe, fill=Y, stroke=YS)

    sl_be = b.swimlane(400, 170, 500, 1400, "Express Payment Controller", "#e1d5e7", "#9673a6")
    b.rect(20, 50, 460, 120, "POST /payments/create-order\ncreateOrderLimiter\nverifyToken → loadAuthUser → paymentService.createOrder", parent=sl_be, fill=G, stroke=GS)
    b.rect(20, 190, 460, 110, "POST /payments/verify\nverifyLimiter\nHMAC signature verify (orderId|paymentId)", parent=sl_be, fill=G, stroke=GS)
    b.rect(20, 320, 460, 90, "GET /payments/status/:id\nOwner or admin role check", parent=sl_be, fill=G, stroke=GS)
    b.rect(20, 430, 460, 90, "POST /payments/refund\nadmin role + dual approval", parent=sl_be, fill=Y, stroke=YS)
    b.rect(20, 540, 460, 120, "POST /payments/webhook (async)\nRaw body BEFORE express.json\nwebhookLimiter → processWebhook", parent=sl_be, fill=G, stroke=GS)
    b.rect(20, 680, 460, 200, "Middleware order:\nhttpsEnforce → requestContext → inputSanitizer\n→ originGuard → verifyToken → loadAuthUser → limiter", parent=sl_be, fill="#ffffff", stroke="#9673a6")
    b.rect(20, 900, 460, 120, "POST /admin/block-user\nBan user + blocked_entities", parent=sl_be, fill=R, stroke=RS)

    sl_svc = b.swimlane(920, 170, 480, 1400, "Payment & Settlement Services", "#d5e8d4", "#82b366")
    b.rect(20, 50, 440, 150, "paymentService.js\ncreateOrder → validate → risk → Razorpay\nverifyPayment → SUCCESS + customer balance\nprocessWebhook async", parent=sl_svc, fill=G, stroke=GS)
    b.rect(20, 220, 440, 100, "razorpayService.js\norders.create, verifySignature\nverifyWebhookSignature, createRefund", parent=sl_svc, fill=G, stroke=GS)
    b.rect(20, 340, 440, 100, "validationService + settlementValidation\nEntity validation before settlement", parent=sl_svc, fill=G, stroke=GS)
    b.rect(20, 460, 440, 100, "webhookReplayGuard\nwebhook_replay_guard table\nnonce + payload_hash dedup", parent=sl_svc, fill=G, stroke=GS)
    b.rect(20, 580, 440, 100, "auditRepository\npayment_audit_logs per action", parent=sl_svc, fill=G, stroke=GS)
    b.rect(20, 700, 440, 120, "Redis / in-memory limiter\nenterpriseLimiter + paymentRateLimit\nIP / user / device keys", parent=sl_svc, fill=Y, stroke=YS)
    b.rect(20, 840, 440, 120, "Socket.IO payments/socket.js\nRooms: user:{id}, admin:payments\nEvents: payment:update, payment:admin", parent=sl_svc, fill=G, stroke=GS)

    sl_ext = b.swimlane(1420, 170, 360, 1400, "External — Razorpay", "#fff2cc", "#d6b656")
    b.rect(20, 50, 320, 100, "Razorpay Orders API\nINR, payment_capture:1", parent=sl_ext, fill=Y, stroke=YS)
    b.rect(20, 170, 320, 120, "UPI Checkout\nIntent / QR / Collect flows\nPending until capture", parent=sl_ext, fill=Y, stroke=YS)
    b.rect(20, 310, 320, 100, "Webhook POST\npayment.captured / failed\nx-razorpay-signature HMAC", parent=sl_ext, fill=Y, stroke=YS)
    b.rect(20, 430, 320, 80, "Refunds API\nAdmin-initiated", parent=sl_ext, fill=Y, stroke=YS)

    sl_fraud = b.swimlane(1800, 170, 420, 1400, "Fraud Intelligence Layer", "#f8cecc", "#b85450")
    b.rect(20, 50, 380, 180, "riskEngineV2 checks:\n• abnormal amount (30d avg)\n• velocity / rapid retries\n• duplicate idempotency key\n• multi-account device\n• IP/device/customer blocked", parent=sl_fraud, fill=R, stroke=RS)
    b.rect(20, 250, 380, 120, "deviceTrustService\nemulator / headless detection\ndevice mismatch, geo mismatch", parent=sl_fraud, fill=R, stroke=RS)
    b.rect(20, 390, 380, 100, "Webhook signature verification\nReplay prevention", parent=sl_fraud, fill=G, stroke=GS)
    b.rect(20, 510, 380, 100, "FLAGGED_FOR_REVIEW hold\nAdmin fraud queue review", parent=sl_fraud, fill=Y, stroke=YS)
    b.rect(20, 630, 380, 100, "BLOCKED terminal state\nPaymentBlockedError 403", parent=sl_fraud, fill=R, stroke=RS)

    sl_db = b.swimlane(2240, 170, 500, 1400, "MySQL Tables", "#f5f5f5", "#666666")
    tables = [
        ("payment_orders", "status, risk_score, idempotency_key"),
        ("payment_transactions", "razorpay_payment_id, payer_vpa"),
        ("payment_attempts", "attempt_no, error_code"),
        ("payment_webhooks", "payload_hash, replay_detected"),
        ("payment_refunds", "status PENDING→PROCESSED"),
        ("payment_audit_logs", "entity_type, action"),
        ("customers", "outstanding_balance on SUCCESS"),
    ]
    for i, (t, d) in enumerate(tables):
        b.rect(20, 50 + i * 95, 460, 85, f"{t}\n{d}", parent=sl_db, fill=G, stroke=GS, font_size=10)

    # Detailed API matrix
    b.rect(40, 1600, 3500, 520, "", fill="#ffffff", stroke="#333333")
    apis = """API DETAIL MATRIX
POST /payments/create-order | Auth: JWT + loadAuthUser | AuthZ: own user | Validation: amount, customer, distributor | Idempotency: idempotencyKey → return existing | Fraud: riskEngineV2 + deviceTrust | DB: payment_orders(CREATED→INITIATED|BLOCKED|FLAGGED), payment_attempts, payment_transactions, payment_audit_logs, user_risk_scores | WS: payment:update INITIATED
POST /payments/verify | Auth: JWT | AuthZ: order.user_id match | Validation: HMAC razorpay signature | Duplicate: razorpay_payment_id | DB: payment_orders SUCCESS, payment_transactions, customers balance | WS: payment:update SUCCESS
GET /payments/status/:id | Auth: JWT | AuthZ: owner or admin | DB: payment_orders + payment_transactions read
POST /payments/webhook | Auth: HMAC signature (no JWT) | Replay: webhookReplayGuard | DB: payment_webhooks, payment_orders status | WS: payment:update (async)
POST /payments/refund | Auth: admin role | Dual: admin_action_approvals | DB: payment_refunds, payment_orders REFUNDED | WS: payment:update REFUNDED
POST /risk/analyze | Auth: JWT | DB: blocked checks, user_risk_scores, suspicious_activities | Response: riskScore, action, deviceTrust"""
    b.rect(60, 1620, 3460, 480, apis, fill="#fafafa", stroke="#999999", font_size=10)

    b2 = DrawioBuilder(3000, 2200)
    b2.rect(20, 20, 2960, 40, "Payment Sequence — Create → UPI → Verify → Webhook", bold=True, font_size=16, align="center", fill="#f5f5f5")
    steps = [
        (60, 80, 2800, 70, "1. Client POST /payments/create-order → CREATED → Risk Engine → BLOCKED | FLAGGED | INITIATED", G, GS),
        (60, 170, 2800, 70, "2. Razorpay order created → Checkout UPI → PENDING/PROCESSING on client", Y, YS),
        (60, 260, 2800, 70, "3. User completes UPI → POST /payments/verify → signature check → SUCCESS + audit log", G, GS),
        (60, 350, 2800, 70, "4. Async: Razorpay POST /payments/webhook → replay guard → duplicate-safe SUCCESS/FAILED", G, GS),
        (60, 440, 2800, 70, "5. Socket.IO emit payment:update to user:{id} and admin:payments", G, GS),
        (60, 530, 2800, 70, "6. Refund: POST /admin/payments/refund/request → approval → POST /payments/refund → REFUNDED", Y, YS),
        (60, 620, 2800, 70, "7. Fraud hold: FLAGGED_FOR_REVIEW → GET /admin/payments/fraud-queue → POST /admin/payments/review/:id", Y, YS),
    ]
    for s in steps:
        b2.rect(*s)

    page1 = b.build_page("Payment System")
    return b.build_file("Payment Architecture", [page1, b2.build_page("Payment Sequence")])


def build_fraud_diagram():
    b = DrawioBuilder(3200, 2600)
    G, Y, R = "#d5e8d4", "#fff2cc", "#f8cecc"
    GS, YS, RS = "#82b366", "#d6b656", "#b85450"

    b.rect(20, 20, 3160, 50, "ThumbsUpApp — Fraud Engine V2 & Risk Intelligence Architecture", bold=True, font_size=18, fill="#f5f5f5", align="center")

    sl_in = b.swimlane(40, 90, 380, 1100, "Risk Inputs", "#dae8fc", "#6c8ebf")
    b.rect(20, 50, 340, 90, "POST /risk/analyze\n{ amount, customerId? }", parent=sl_in, fill=G, stroke=GS)
    b.rect(20, 160, 340, 90, "create-order context\nuserId, amountPaise, ip, deviceFingerprint", parent=sl_in, fill=G, stroke=GS)
    b.rect(20, 270, 340, 100, "Device signals\nisEmulator, isHeadless, isAutomation\nX-Device-Fingerprint header", parent=sl_in, fill=G, stroke=GS)
    b.rect(20, 390, 340, 80, "Geo/IP\ngeo_country, geo_region\nimpossible_travel", parent=sl_in, fill=Y, stroke=YS)
    b.rect(20, 490, 340, 80, "External providers\nSocure + Sardine (optional)", parent=sl_in, fill=Y, stroke=YS)

    sl_core = b.swimlane(440, 90, 520, 1100, "riskEngineV2 Core", "#d5e8d4", "#82b366")
    b.rect(20, 50, 480, 200, "analyzePaymentRiskInternal\n1. blocked_entities (user,ip,device,customer)\n2. velocity_exceeded (payment_orders)\n3. high_failure_ratio (7d)\n4. abnormal_amount (30d avg × multiplier)\n5. multi_account_device (24h)\n6. untrusted_device (trustScore&lt;30)\n7. new_account (&lt;2 days)\n8. refund_abuse", parent=sl_core, fill=G, stroke=GS)
    b.rect(20, 270, 480, 120, "riskOrchestrator\nBlend: internal×0.7 + external×0.3\nscoreToCategory → categoryToAction\nThresholds: low25 med50 high75 crit90", parent=sl_core, fill=G, stroke=GS)
    b.rect(20, 410, 480, 100, "Actions\nallow → proceed | verify → medium\nhold/flag → FLAGGED_FOR_REVIEW\nblock → BLOCKED + PaymentBlockedError", parent=sl_core, fill=G, stroke=GS)
    b.rect(20, 530, 480, 100, "recordSuspicious\nINSERT suspicious_activities\nseverity by score", parent=sl_core, fill=Y, stroke=YS)
    b.rect(20, 650, 480, 100, "upsertRiskScore\nuser_risk_scores table", parent=sl_core, fill=G, stroke=GS)

    sl_dev = b.swimlane(980, 90, 400, 1100, "Device Trust Engine", "#fff2cc", "#d6b656")
    b.rect(20, 50, 360, 180, "deviceTrustService.evaluateDeviceTrust\n• blocked_devices check\n• device_sessions upsert\n• trustScore 0-100\n• emulator/headless penalties\n• impossible_travel → security_incidents", parent=sl_dev, fill=Y, stroke=YS)
    b.rect(20, 250, 360, 100, "trusted_devices (schema)\nbrowser_hash, os_name, timezone", parent=sl_dev, fill=Y, stroke=YS, dashed=1)
    b.rect(20, 370, 360, 100, "device mismatch\nNew fingerprint vs history", parent=sl_dev, fill=R, stroke=RS)
    b.rect(20, 490, 360, 100, "IP reputation\nblocked_entities type=ip", parent=sl_dev, fill=R, stroke=RS)

    sl_out = b.swimlane(1400, 90, 400, 1100, "Outputs & Integrations", "#e1d5e7", "#9673a6")
    b.rect(20, 50, 360, 120, "Payment decision\nblock | hold | allow\nriskScore on payment_orders", parent=sl_out, fill=G, stroke=GS)
    b.rect(20, 190, 360, 100, "Rate limiter feedback\nenterpriseLimiter → suspicious_activities", parent=sl_out, fill=Y, stroke=YS)
    b.rect(20, 310, 360, 100, "Admin fraud queue\nsuspicious_activities reviewed=0", parent=sl_out, fill=Y, stroke=YS)
    b.rect(20, 430, 360, 100, "Webhook replay\nwebhook_replay_guard", parent=sl_out, fill=G, stroke=GS)
    b.rect(20, 550, 360, 100, "Duplicate payment detection\nidempotency_key UNIQUE\nrazorpay_payment_id UNIQUE", parent=sl_out, fill=G, stroke=GS)

    sl_prov = b.swimlane(1820, 90, 360, 1100, "External Providers", "#f8cecc", "#b85450")
    b.rect(20, 50, 320, 100, "socureProvider.js\nSOCURE_ENABLED + API_KEY", parent=sl_prov, fill=Y, stroke=YS)
    b.rect(20, 170, 320, 100, "sardineProvider.js\nSARDINE_ENABLED + API_KEY", parent=sl_prov, fill=Y, stroke=YS)
    b.rect(20, 290, 320, 100, "internalRiskProvider.js\nWraps analyzePaymentRiskInternal", parent=sl_prov, fill=G, stroke=GS)

    b.rect(40, 1220, 3120, 400, "DATA FLOW: Request → requestContext (IP, fingerprint) → deviceTrustService → fraudEngine.analyzePaymentRisk → blocked_entities? → score rules → orchestrator blend → action → payment_orders.status | suspicious_activities | user_risk_scores\nATTACK PREVENTION: SQLi inputGuard | Rate limit burst | Block lists | Webhook HMAC + replay | Idempotency | Multi-account device | Abnormal amount | Rapid retries | Emulator/headless", fill="#fafafa", stroke="#333333", font_size=11)

    b2 = DrawioBuilder(2800, 1800)
    b2.rect(20, 20, 2760, 40, "Fraud Scoring Decision Tree", bold=True, font_size=16, align="center", fill="#f5f5f5")
    b2.ellipse(1200, 80, 200, 80, "Risk Score", Y, YS)
    b2.rect(200, 220, 400, 80, "score ≥ 90 OR block rule\n→ BLOCKED (red)", fill=R, stroke=RS)
    b2.rect(800, 220, 400, 80, "score ≥ 75\n→ FLAGGED / hold (yellow)", fill=Y, stroke=YS)
    b2.rect(1400, 220, 400, 80, "score ≥ 50\n→ verify / monitor (yellow)", fill=Y, stroke=YS)
    b2.rect(2000, 220, 400, 80, "score &lt; 50\n→ allow (green)", fill=G, stroke=GS)

    return b.build_file("Fraud Engine", [b.build_page("Risk Engine Components"), b2.build_page("Scoring Decision Tree")])


def build_admin_diagram():
    b = DrawioBuilder(3000, 2400)
    G, Y, R = "#d5e8d4", "#fff2cc", "#f8cecc"
    GS, YS, RS = "#82b366", "#d6b656", "#b85450"

    b.rect(20, 20, 2960, 50, "ThumbsUpApp — Admin Review & Intervention Flow", bold=True, font_size=18, fill="#f5f5f5", align="center")

    tb = b.rect(40, 90, 2920, 100, "ADMIN TRUST BOUNDARY — JWT role=admin + adminIpAllowlist + adminSessionTimeout + adminLimiter + adminAudit", fill="#e8f4fc", stroke="#6c8ebf", dashed=1)

    sl_adm = b.swimlane(60, 210, 400, 1050, "Admin Dashboard (React)", "#dae8fc", "#6c8ebf")
    b.rect(20, 50, 360, 90, "Payment Monitor\nGET /admin/payments/monitor", parent=sl_adm, fill=G, stroke=GS)
    b.rect(20, 160, 360, 90, "Fraud Queue UI\nGET /admin/payments/fraud-queue", parent=sl_adm, fill=Y, stroke=YS)
    b.rect(20, 270, 360, 90, "Webhook Log Viewer\nGET /admin/payments/webhooks", parent=sl_adm, fill=G, stroke=GS)
    b.rect(20, 380, 360, 100, "Refund Request\nPOST /admin/payments/refund/request", parent=sl_adm, fill=Y, stroke=YS)
    b.rect(20, 500, 360, 90, "Block User\nPOST /admin/block-user", parent=sl_adm, fill=R, stroke=RS)
    b.rect(20, 610, 360, 90, "Unblock\nPOST /admin/unblock-user", parent=sl_adm, fill=G, stroke=GS)
    b.rect(20, 720, 360, 90, "Review Alert\nPOST /admin/payments/review/:id", parent=sl_adm, fill=G, stroke=GS)
    b.rect(20, 830, 360, 90, "Execute Refund\nPOST /payments/refund", parent=sl_adm, fill=Y, stroke=YS)

    sl_api = b.swimlane(480, 210, 480, 1050, "Admin API Layer", "#e1d5e7", "#9673a6")
    b.rect(20, 50, 440, 150, "Middleware chain:\nverifyToken → loadAuthUser → requireRole('admin')\n→ adminLimiter → adminIpAllowlist\n→ adminSessionTimeout → adminAudit(action)", parent=sl_api, fill=G, stroke=GS)
    b.rect(20, 220, 440, 120, "POST /admin/block-user\nbody: { userId, reason }\nblocked_entities + users.status=banned\nsuspicious_activities admin_block", parent=sl_api, fill=R, stroke=RS)
    b.rect(20, 360, 440, 140, "Dual-control refund\n1. POST /admin/payments/refund/request\n   → admin_action_approvals PENDING\n2. Second admin POST /payments/refund\n   { approvalId } → APPROVED → Razorpay refund", parent=sl_api, fill=Y, stroke=YS)
    b.rect(20, 520, 440, 120, "POST /admin/payments/review/:id\nUPDATE suspicious_activities\nreviewed=1, reviewed_by, reviewed_at", parent=sl_api, fill=G, stroke=GS)
    b.rect(20, 660, 440, 100, "GET /admin/payments/monitor\npayment_orders 7d stats\nflagged filter", parent=sl_api, fill=G, stroke=GS)
    b.rect(20, 780, 440, 100, "Socket room admin:payments\nReceives payment:admin events", parent=sl_api, fill=G, stroke=GS)

    sl_flow = b.swimlane(980, 210, 560, 1050, "Review Queue Workflow", "#fff2cc", "#d6b656")
    b.rect(20, 50, 520, 100, "1. Payment FLAGGED_FOR_REVIEW\nriskEngine hold action", parent=sl_flow, fill=Y, stroke=YS)
    b.rect(20, 170, 520, 100, "2. INSERT suspicious_activities\nseverity high/critical", parent=sl_flow, fill=Y, stroke=YS)
    b.rect(20, 290, 520, 100, "3. Admin opens fraud-queue\nunreviewed items list", parent=sl_flow, fill=Y, stroke=YS)
    b.rect(20, 410, 520, 100, "4. Investigation\npayment_orders + audit_logs + webhooks", parent=sl_flow, fill=G, stroke=GS)
    b.rect(20, 530, 520, 100, "5a. Approve → release / manual verify\n5b. POST /admin/block-user", parent=sl_flow, fill=R, stroke=RS)
    b.rect(20, 650, 520, 100, "6. POST /admin/payments/review/:id\nMark reviewed", parent=sl_flow, fill=G, stroke=GS)
    b.rect(20, 770, 520, 100, "7. Optional refund path\nadmin_action_approvals", parent=sl_flow, fill=Y, stroke=YS)

    sl_db = b.swimlane(1560, 210, 420, 1050, "Database", "#f5f5f5", "#666666")
    tables = [
        "suspicious_activities — fraud queue",
        "admin_action_approvals — dual refund",
        "admin_audit_logs — every admin action",
        "blocked_entities — block/unblock",
        "users.status — banned/active",
        "payment_orders — FLAGGED/BLOCKED/REFUNDED",
        "payment_audit_logs — full trail",
    ]
    for i, t in enumerate(tables):
        b.rect(20, 50 + i * 95, 380, 85, t, parent=sl_db, fill=G if "audit" in t or "payment_orders" in t else Y if "approval" in t or "suspicious" in t else R if "blocked" in t else G, stroke=GS, font_size=10)

    b.rect(60, 1300, 2880, 350, "ADMIN API SECURITY CHECKLIST\nAuthentication: Bearer JWT | Authorization: requireRole(admin) + loadAuthUser | Network: adminIpAllowlist | Session: adminSessionTimeout (JWT iat) | Rate: adminLimiter | Audit: adminAudit → admin_audit_logs\nPOST /admin/block-user: parseStrictPositiveInt userId, sanitizeString reason, blockedRepo.blockEntity, UPDATE users, fraudEngine.recordSuspicious critical\nRefund: createAdminApproval PENDING → second admin approveAction → razorpayService.createRefund → payment_refunds + payment_orders REFUNDED → Socket payment:update", fill="#fafafa", font_size=10)

    return b.build_file("Admin Review Flow", [b.build_page("Admin Intervention")])


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    files = {
        "auth-architecture.drawio": build_auth_diagram(),
        "payment-architecture.drawio": build_payment_diagram(),
        "fraud-engine-architecture.drawio": build_fraud_diagram(),
        "admin-review-flow.drawio": build_admin_diagram(),
    }
    for name, content in files.items():
        path = os.path.join(OUT_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Wrote {path} ({len(content)} bytes)")


if __name__ == "__main__":
    main()
