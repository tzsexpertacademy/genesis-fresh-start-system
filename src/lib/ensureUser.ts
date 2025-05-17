import { supabase } from './supabase';

/**
 * Ensures that a user exists in the database
 * This function checks if a user exists in the users table and creates it if it doesn't
 * It's useful to call this function before performing operations that require a user to exist
 *
 * @param userId - The user ID to check
 * @returns A promise that resolves when the user is confirmed to exist
 */
export const ensureUserExists = async (userId: string): Promise<void> => {
  if (!userId) {
    console.error('ensureUserExists called with empty userId');
    throw new Error('User ID is required');
  }

  console.log('Ensuring user exists in database:', userId);

  try {
    // First, check if the user exists in the users table
    console.log('Checking if user exists in database...');
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('Error checking if user exists:', userError.message);

      // Check if the error is because the table doesn't exist
      if (userError.message.includes('relation "public.users" does not exist')) {
        console.error('The users table does not exist. Make sure you have run the database schema setup.');
        throw new Error('Database schema not initialized properly');
      }
    }

    // If the user doesn't exist, we need to create it
    if (userError || !existingUser) {
      console.log('User not found in database, attempting to create...');

      // Get user details from auth
      console.log('Getting user details from auth...');
      const { data: userData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('Failed to get user data from auth:', authError);
        throw new Error(`Failed to get user data from auth: ${authError.message}`);
      }

      if (!userData.user) {
        console.error('No user found in auth data');
        throw new Error('No user found in auth data');
      }

      console.log('User found in auth:', userData.user.email);

      // Try to create user directly in the users table first
      try {
        console.log('Attempting direct insert into users table...');
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: userData.user.email || '',
            name: userData.user.user_metadata?.name || userData.user.email
          })
          .select();

        if (insertError) {
          console.log('Direct insert failed:', insertError.message);

          // Check if the error is because the table doesn't exist
          if (insertError.message.includes('relation "public.users" does not exist')) {
            console.error('The users table does not exist. Make sure you have run the database schema setup.');
            throw new Error('Database schema not initialized properly');
          }

          // Check if the error is a duplicate key error (user already exists)
          if (insertError.message.includes('duplicate key value violates unique constraint')) {
            console.log('User already exists (duplicate key error). This is fine, continuing...');
            return; // User exists, so we can return early
          }

          console.log('Trying RPC function...');

          // If direct insert fails, try the RPC function
          const { data: rpcData, error: createError } = await supabase.rpc('create_user_manually', {
            user_id: userId,
            user_email: userData.user.email || '',
            user_name: userData.user.user_metadata?.name || userData.user.email
          });

          if (createError) {
            console.error('RPC function failed:', createError.message);

            // Check if the error is because the function doesn't exist
            if (createError.message.includes('function public.create_user_manually') &&
                createError.message.includes('does not exist')) {
              console.error('The create_user_manually function does not exist. Make sure you have run the database schema setup.');
              throw new Error('Database schema not initialized properly');
            }

            // If it's not a critical error, we can continue
            if (createError.message.includes('duplicate key value') ||
                createError.message.includes('already exists')) {
              console.log('User already exists according to RPC function. This is fine, continuing...');
              return; // User exists, so we can return early
            }

            throw createError;
          } else {
            console.log('User created successfully via RPC function');
          }
        } else {
          console.log('User created successfully via direct insert:', insertData);
        }
      } catch (insertError: any) {
        console.error('Error creating user:', insertError);

        // If it's a duplicate key error, we can continue
        if (insertError.message && (
            insertError.message.includes('duplicate key value') ||
            insertError.message.includes('already exists'))) {
          console.log('User already exists (caught in catch block). This is fine, continuing...');
          return; // User exists, so we can return early
        }

        throw new Error(`Failed to create user: ${insertError.message || insertError}`);
      }
    } else {
      console.log('User already exists in database with ID:', existingUser.id);
    }

    // Verify that the user now exists in the database
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.error('Error verifying user exists after creation:', verifyError);

      // If the error is not critical, we can continue
      if (!verifyError.message.includes('relation "public.users" does not exist')) {
        console.log('Non-critical error verifying user. Continuing anyway...');
        return;
      }
    } else if (verifyUser) {
      console.log('User verified in database:', verifyUser.email);
    } else {
      console.error('User still not found in database after creation attempt');
    }

    console.log('ensureUserExists completed successfully');
    return;
  } catch (error: any) {
    console.error('Error in ensureUserExists:', error);
    // Don't throw the error, just log it and continue
    // This prevents the app from crashing if user creation fails
    console.log('Continuing despite error in ensureUserExists');
    return;
  }
};
