import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.AUTH_JWT_SECRET!);

export async function signToken(payload: {
  sub: number;
  role: string;
  deviceId: string;
}) {
  return new SignJWT({ role: payload.role, deviceId: payload.deviceId })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime("90d")
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return {
    userId: Number(payload.sub),
    role: payload.role as string,
    deviceId: payload.deviceId as string,
  };
}

export async function signExchangeToken(payload: {
  sub: number;
  role: string;
  deviceId: string;
}) {
  return new SignJWT({
    role: payload.role,
    deviceId: payload.deviceId,
    purpose: "web-exchange",
  })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime("60s")
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret());
}

export async function verifyExchangeToken(token: string) {
  const { payload } = await jwtVerify(token, secret());
  if (payload.purpose !== "web-exchange") {
    throw new Error("Invalid token purpose");
  }
  return {
    userId: Number(payload.sub),
    role: payload.role as string,
    deviceId: payload.deviceId as string,
  };
}
