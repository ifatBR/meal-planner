import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FormField } from '@/components/FormField';
import { PageTitle, BodyText } from '@/components/Typography';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/utils/constants';
import { COLORS, RADII, SHADOWS, SPACING } from '@/styles/designTokens';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, password });
      navigate(ROUTES.SCHEDULES, { replace: true });
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg={COLORS.bg.base}
    >
      <Box
        as="form"
        onSubmit={handleSubmit}
        bg={COLORS.bg.surface}
        borderRadius={RADII.xl}
        boxShadow={SHADOWS.md}
        p={SPACING[8]}
        w="100%"
        maxW="400px"
      >
        <Flex direction="column" gap={SPACING[6]}>
          <Flex direction="column" gap={SPACING[2]}>
            <PageTitle>Sign in</PageTitle>
            <BodyText secondary>Enter your credentials to continue</BodyText>
          </Flex>

          <Flex direction="column" gap={SPACING[4]}>
            <FormField label="Email" required>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>
          </Flex>

          {error && (
            <BodyText secondary>
              <Box as="span" color={COLORS.semantic.error}>{error}</Box>
            </BodyText>
          )}

          <Button type="submit" variant="primary" isLoading={isLoading} width="100%">
            Sign in
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
