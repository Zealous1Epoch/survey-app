import { SignJWT, jwtVerify } from "jose";

const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 天

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET 环境变量未设置");
  return new TextEncoder().encode(secret);
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

/** 签发 JWT */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(getSecret());
}

/** 验证 JWT，返回 payload 或 null */
export async function verifyToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload &&
      typeof payload.userId === "string" &&
      typeof payload.username === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        userId: payload.userId,
        username: payload.username,
        role: payload.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}