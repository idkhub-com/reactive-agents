import { zodResolver } from '@hookform/resolvers/zod';
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router';
import { login } from '@web/api/v1/reactive-agents/auth';
import { AnimatedLogo } from '@web/components/side-bar/animated-logo';
import { Button } from '@web/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@web/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@web/components/ui/form';
import { Input } from '@web/components/ui/input';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export const Route = createLazyFileRoute('/login')({
  component: LoginPage,
});

const formSchema = z.object({
  password: z.string().min(1),
});

function LoginPage(): React.ReactNode {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function handleLogin(data: z.infer<typeof formSchema>): Promise<void> {
    const success = await login(data.password);
    if (!success) {
      setError('Invalid password');
      return;
    }
    navigate({ to: '/agents' });
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 mb-0">
            <div className="flex flex-col gap-2">
              <div className="w-full h-16">
                <AnimatedLogo isCollapsed={false} />
              </div>
              <span className="text-2xl font-bold">
                Enter password to continue
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLogin)}
              onChange={(): void => setError(null)}
              className="flex flex-col w-full gap-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }): React.ReactElement => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <p className="text-red-600 leading-0 text-sm">{error}</p>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Logging in…' : 'Login'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
