declare module "argon2" {
  export function hash(data: string, opts?: any): Promise<string>;
  export function verify(hash: string, data: string, opts?: any): Promise<boolean>;
  const argon2: {
    hash: typeof hash;
    verify: typeof verify;
  };
  export default argon2;
}
