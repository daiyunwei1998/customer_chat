'use client'
import React from 'react'
import { Box, Flex, Button, Image, Text, useColorModeValue, useBreakpointValue } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { chatServiceHost } from '@/app/config'

const Navbar = ({ name, logo, userId, tenantId, jwt }) => {
  const router = useRouter()
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const fontSize = useBreakpointValue({ base: 'lg', md: 'xl', lg: '2xl' })
  const logoSize = useBreakpointValue({ base: '30px', md: '35px', lg: '40px' })


  const handleLogout = async () => {

    try {
      const response = await fetch(`${chatServiceHost}/api/v1/tenants/${tenantId}/users/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (response.ok) {
        router.push('/login')
      } else {
        console.error('Logout failed', response.statusText)
      }
    } catch (error) {
      console.error('An error occurred during logout', error)
    }
  }

  return (
    <Box bg={bgColor} borderBottom={`1px solid ${borderColor}`} height="72px">
      <Flex justify="space-between" align="center" height="100%" px={4}>
        <Box flex={1} /> {/* Spacer */}
        <Flex align="center" justify="center" flex={1} maxWidth="50%">
          <Image src={logo} alt="Logo" boxSize={logoSize} mr={2} objectFit="contain" />
          <Text fontSize={fontSize} fontWeight="bold" noOfLines={1} textOverflow="ellipsis" whiteSpace="nowrap" overflow="hidden">
            {name}
          </Text>
        </Flex>
        <Box flex={1} textAlign="right">
          {jwt && (
            <Button onClick={handleLogout} colorScheme="red" size="sm">
              Logout
            </Button>
          )}
        </Box>
      </Flex>
    </Box>
  )
}

export default Navbar