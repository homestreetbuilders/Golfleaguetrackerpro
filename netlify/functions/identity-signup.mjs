// Identity signup event — assigns default role
const handler = async (event) => {
  const { user } = JSON.parse(event.body || '{}');

  // First registered user gets admin role; everyone else starts as player
  // Admins can later promote users via the Admin panel
  const existingRoles = user?.app_metadata?.roles || [];
  const roles = existingRoles.length > 0 ? existingRoles : ['player'];

  return {
    statusCode: 200,
    body: JSON.stringify({
      app_metadata: {
        ...user.app_metadata,
        roles,
      },
    }),
  };
};

export { handler };
