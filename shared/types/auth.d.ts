declare module "#auth-utils" {
  interface User {
    id: number;
    name: string;
    email: string;
    role: "owner" | "admin";
  }

  interface SecureSessionData {
    sessionVersion: number;
  }
}

export {};
