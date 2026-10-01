import assert from "node:assert";
import http from "node:http";
import Auth from "../core/auth.js";
import Hash from "../core/hash.js";
import Validator from "../core/validate.js";
import Cache from "../core/cache.js";
import Render from "../core/render.js";
import App from "../core/app.js";
import Router from "../core/router.js";

/**
 * Executes the Blue Bird test suite.
 */
async function runTests() {
  console.log("[TEST] Starting Blue Bird v2 test suite...");

  const testSecret = "test-secret-key-at-least-32-chars-long!";
  const testPayload = { userId: 42, role: "admin", name: "Tester" };

  const encrypted = Auth.encrypt(testPayload, testSecret);
  assert.strictEqual(typeof encrypted, "string");
  const decrypted = Auth.decrypt(encrypted, testSecret);
  assert.deepStrictEqual(decrypted, testPayload);
  console.log("[PASS] AES-256-GCM encryption & decryption");

  const token = Auth.generateToken(testPayload, testSecret, "1h");
  assert.strictEqual(typeof token, "string");
  const verified = Auth.verifyToken(token, testSecret);
  assert.strictEqual(verified.userId, 42);
  assert.strictEqual(verified.role, "admin");
  assert.strictEqual(verified.name, "Tester");
  console.log("[PASS] Native JWT signing & verification");

  const invalidToken = token + "corrupted";
  const verifiedInvalid = Auth.verifyToken(invalidToken, testSecret);
  assert.strictEqual(verifiedInvalid, null);
  console.log("[PASS] Invalid token signature rejection");

  const rawPassword = "securePassword123!";
  const hashedPassword = await Hash.make(rawPassword);
  assert.strictEqual(typeof hashedPassword, "string");
  assert.ok(hashedPassword.startsWith("$scrypt$"));
  const isValidPassword = await Hash.verify(rawPassword, hashedPassword);
  assert.strictEqual(isValidPassword, true);
  const isWrongPassword = await Hash.verify("wrongPassword", hashedPassword);
  assert.strictEqual(isWrongPassword, false);
  console.log("[PASS] Scrypt password hashing & verification");

  const schema = {
    email: { required: true, email: true },
    age: { required: true, number: true },
    role: { required: false },
  };
  const validator = new Validator(schema, "en");

  const validData = { email: "user@example.com", age: 25, role: "member" };
  const validResult = await validator.validate(validData);
  assert.strictEqual(validResult.success, true);
  assert.strictEqual(validResult.errors.length, 0);

  const invalidData = { email: "not-an-email", age: "not-a-number" };
  const invalidResult = await validator.validate(invalidData);
  assert.strictEqual(invalidResult.success, false);
  assert.ok(invalidResult.errors.length >= 2);
  console.log("[PASS] Validator schema verification");

  await Cache.set("test_key", { value: 123 }, 60);
  const cachedVal = await Cache.get("test_key");
  assert.deepStrictEqual(cachedVal, { value: 123 });
  await Cache.delete("test_key");
  const deletedVal = await Cache.get("test_key");
  assert.strictEqual(deletedVal, null);
  console.log("[PASS] Cache storage, retrieval, and deletion");

  const testRouter = new Router("/test");
  testRouter.get("/ping", (req, res) => {
    res.ok({ pong: true }, "Test successful");
  });

  const webRouter = new Router("/");
  webRouter.get("/test-view", Render.view("index"));

  const testPort = 3999;
  const app = new App({
    port: testPort,
    host: "http://localhost",
    routes: [webRouter, testRouter],
    logger: false,
    notFound: true,
  });

  await app.run();

  await new Promise((resolve) => setTimeout(resolve, 500));

  const healthRes = await fetch(`http://localhost:${testPort}/api/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, "ok");
  console.log("[PASS] Express server startup & /api/health endpoint");

  const pingRes = await fetch(`http://localhost:${testPort}/test/ping`);
  assert.strictEqual(pingRes.status, 200);
  const pingData = await pingRes.json();
  assert.strictEqual(pingData.status, "success");
  assert.deepStrictEqual(pingData.data, { pong: true });
  console.log("[PASS] Router dispatching & res.ok() helper");

  const viewRes = await fetch(`http://localhost:${testPort}/test-view`);
  assert.strictEqual(viewRes.status, 200);
  const viewHtml = await viewRes.text();
  assert.ok(viewHtml.includes("<!DOCTYPE html>"));
  assert.ok(viewHtml.includes("Blue Bird"));
  console.log("[PASS] Render engine view delivery");

  await app.close();
  console.log("[PASS] All tests completed successfully.");
}

runTests().catch((err) => {
  console.error("[FAIL] Test suite encountered an error:", err);
  process.exit(1);
});
