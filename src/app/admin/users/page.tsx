import { Card, CardContent } from "@/components/ui/card"
import { UserManagement } from "@/components/users/UserManagement"
import { getUsers } from "@/actions/users"
import { createClient } from "@/lib/supabase/server"

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const users = await getUsers()

  return (
    <div>
      <h1 className="text-dark text-2xl font-bold mb-6">Brukere</h1>
      <Card>
        <CardContent className="p-6">
          <UserManagement users={users} currentUserId={user?.id || ""} />
        </CardContent>
      </Card>
    </div>
  )
}
