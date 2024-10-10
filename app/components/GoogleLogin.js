import { Button } from '@chakra-ui/react';
import { FcGoogle } from 'react-icons/fc';

const GoogleLogin = () => {
  const initiateGoogleOAuth = () => {
    const tenant = window.location.hostname; // e.g., tenant1.flashresponse.net

    // Redirect to the central OAuth handler with tenant information
    window.location.href = `https://auth.flashresponse.net/auth?tenant=${tenant}`;
  };

  return (
    <Button
      w={'full'}
      variant={'outline'}
      leftIcon={<FcGoogle />}
      onClick={initiateGoogleOAuth}
    >
      使用 Google 登入
    </Button>
  );
};

export default GoogleLogin;
