<script lang="ts">
  import { useConvexClient } from "convex-svelte";
  import { useClerkContext } from "svelte-clerk";
  import { api } from "convex/_generated/api";

  const client = useConvexClient();
  const ctx = useClerkContext();

  $effect(() => {
    const session = ctx.session;
    client.setAuth(
      async ({ forceRefreshToken }) => {
        if (!session) {
          return null;
        }

        return await session.getToken({
          template: "convex",
          ...(forceRefreshToken ? { skipCache: true } : {}),
        });
      },
      async (isAuthenticated) => {
        if (isAuthenticated) {
          await client.mutation(api.users.store, {});
        }
      },
    );
  });
</script>
