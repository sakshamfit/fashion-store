import { test, expect } from "@playwright/test";
import { requestOrigin, sameOrigin } from "../../lib/request-origin";

function request(
  headers: Record<string, string> = {},
  url = "http://0.0.0.0:3000/api/cart",
) {
  return new Request(url, { headers });
}

test("local Host takes precedence over Next listening address", () => {
  const req = request({
    host: "localhost:3000",
    origin: "http://localhost:3000",
  });
  expect(requestOrigin(req)).toBe("http://localhost:3000");
  expect(sameOrigin(req)).toBe(true);
});

test("HTTPS preview and deployment requests use their public origin", () => {
  for (const host of ["3000-example.e2b.app", "vyrn.example.com"]) {
    const req = request({
      host,
      origin: `https://${host}`,
      "x-forwarded-proto": "https",
    });
    expect(requestOrigin(req)).toBe(`https://${host}`);
    expect(sameOrigin(req)).toBe(true);
  }
});

test("cross-site and missing origins remain rejected", () => {
  for (const origin of [
    "https://attacker.example",
    "null",
    "",
    "https://vyrn.example.com/path",
    "https://user:pass@vyrn.example.com",
  ]) {
    expect(
      sameOrigin(
        request({
          host: "vyrn.example.com",
          origin,
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
  }
  expect(sameOrigin(request({ host: "vyrn.example.com" }))).toBe(false);
});

test("a spoofed forwarded host cannot bypass CSRF protection", () => {
  expect(
    sameOrigin(
      request({
        host: "vyrn.example.com",
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      }),
    ),
  ).toBe(false);
});

test("ports, IPv6 and requests without a Host header are handled", () => {
  expect(
    sameOrigin(
      request({ host: "localhost:3000", origin: "http://localhost:3001" }),
    ),
  ).toBe(false);
  expect(
    sameOrigin(request({ host: "[::1]:3000", origin: "http://[::1]:3000" })),
  ).toBe(true);
  const req = request(
    { origin: "https://vyrn.example.com" },
    "https://vyrn.example.com/api/cart",
  );
  expect(requestOrigin(req)).toBe("https://vyrn.example.com");
  expect(sameOrigin(req)).toBe(true);
});

test("malformed authorities and protocols fail closed", () => {
  for (const host of [
    "vyrn.example.com/evil",
    "attacker.example@vyrn.example.com",
    "vyrn.example.com,attacker.example",
    "vyrn.example.com?evil",
    "vyrn.example.com:invalid",
  ]) {
    expect(
      sameOrigin(
        request({
          host,
          origin: "https://vyrn.example.com",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(false);
  }
  expect(
    sameOrigin(
      request({
        host: "vyrn.example.com",
        origin: "https://vyrn.example.com",
        "x-forwarded-proto": "javascript",
      }),
    ),
  ).toBe(false);
});
