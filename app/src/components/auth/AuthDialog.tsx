import { useState } from 'react';
import type { FormEvent } from 'react';
import { GraduationCapIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional line explaining which action triggered the prompt. */
  reason?: string;
}

export function AuthDialog({ open, onOpenChange, reason }: AuthDialogProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  const reset = () => {
    setError(null);
    setLoginPassword('');
    setRegisterPassword('');
  };

  const run = async (action: () => Promise<void>, successMessage: string) => {
    setPending(true);
    setError(null);
    try {
      await action();
      toast.success(successMessage);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur inattendue est survenue.');
    } finally {
      setPending(false);
    }
  };

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    void run(() => login(loginEmail, loginPassword), 'Connexion réussie.');
  };

  const handleRegister = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () => register(registerEmail, registerPassword, registerName),
      'Compte créé, vous êtes connecté.'
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCapIcon className="size-5" />
            Espace étudiant
          </DialogTitle>
          <DialogDescription>
            {reason ??
              'Créez un compte pour publier votre planning et participer aux discussions de cours.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={value => { setTab(value); setError(null); }}>
          <TabsList className="w-full">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="register">Créer un compte</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              <FieldGroup>
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor="login-email">Adresse e-mail</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={event => setLoginEmail(event.target.value)}
                    aria-invalid={error ? true : undefined}
                  />
                </Field>
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor="login-password">Mot de passe</FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={event => setLoginPassword(event.target.value)}
                    aria-invalid={error ? true : undefined}
                  />
                  {error && <FieldDescription>{error}</FieldDescription>}
                </Field>
                <Button type="submit" disabled={pending}>
                  {pending && <Spinner data-icon="inline-start" />}
                  Se connecter
                </Button>
              </FieldGroup>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="register-name">Pseudo affiché</FieldLabel>
                  <Input
                    id="register-name"
                    autoComplete="nickname"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="ex : Gianni"
                    value={registerName}
                    onChange={event => setRegisterName(event.target.value)}
                  />
                  <FieldDescription>
                    Ce nom apparaît sur vos calendriers et vos messages.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="register-email">Adresse e-mail</FieldLabel>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={registerEmail}
                    onChange={event => setRegisterEmail(event.target.value)}
                  />
                </Field>
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor="register-password">Mot de passe</FieldLabel>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={registerPassword}
                    onChange={event => setRegisterPassword(event.target.value)}
                    aria-invalid={error ? true : undefined}
                  />
                  <FieldDescription>{error ?? '8 caractères minimum.'}</FieldDescription>
                </Field>
                <Button type="submit" disabled={pending}>
                  {pending && <Spinner data-icon="inline-start" />}
                  Créer mon compte
                </Button>
              </FieldGroup>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
