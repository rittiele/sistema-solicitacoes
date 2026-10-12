export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
