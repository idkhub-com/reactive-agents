'use client';

import { Button } from '@client/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@client/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/components/ui/form';
import { Input } from '@client/components/ui/input';
import { APP_URL } from '@client/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  password: z.string().min(1),
});

export default function LoginPage(): React.ReactNode {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
    },
  });

  async function insertPassword(
    data: z.infer<typeof formSchema>,
  ): Promise<void> {
    const response = await fetch(`${APP_URL}/v1/idk/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      setError('Invalid password');
      return;
    }
    redirect('/');
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 mb-0">
            <div className="flex flex-col gap-2">
              <Image
                className="dark:brightness-0 dark:invert"
                src="/assets/brand/idk-logo.png"
                alt="logo"
                width={100}
                height={100}
              />
              <span className="text-2xl font-bold">
                Enter password to continue
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(insertPassword)}
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
                        autoComplete="off"
                        placeholder="Default: idk"
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
              <Button type="submit">Login</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
