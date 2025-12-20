import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/lib/types";
import { toast } from "sonner";

type AppRole = 'admin' | 'manager' | 'seller';

interface SupabaseUser {
  id: string;
  name: string;
  role: AppRole;
}

interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  role: AppRole;
}

export function useSupabaseUsers() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['supabase-users'],
    queryFn: async () => {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: User[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          name: profile.name,
          role: (userRole?.role as AppRole) || 'seller',
          active: true,
        };
      });

      return usersWithRoles;
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-users'] });
      toast.success("Função do usuário atualizada!");
    },
    onError: (error) => {
      console.error('Error updating user role:', error);
      toast.error("Erro ao atualizar função do usuário");
    },
  });

  const updateUserName = useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-users'] });
      toast.success("Nome do usuário atualizado!");
    },
    onError: (error) => {
      console.error('Error updating user name:', error);
      toast.error("Erro ao atualizar nome do usuário");
    },
  });

  const createUser = useMutation({
    mutationFn: async ({ email, password, name, role }: CreateUserParams) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ email, password, name, role }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supabase-users'] });
      toast.success("Usuário cadastrado com sucesso!");
    },
    onError: (error: Error) => {
      console.error('Error creating user:', error);
      toast.error(error.message);
    },
  });

  return {
    users,
    isLoading,
    error,
    updateUserRole: updateUserRole.mutate,
    updateUserName: updateUserName.mutate,
    createUser: createUser.mutate,
    isUpdatingRole: updateUserRole.isPending,
    isUpdatingName: updateUserName.isPending,
    isCreatingUser: createUser.isPending,
  };
}
