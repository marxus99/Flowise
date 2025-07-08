import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// material-ui
import { Stack, useTheme, Typography, Box, Alert, Button, Divider, Icon } from '@mui/material'
import { IconExclamationCircle } from '@tabler/icons-react'
import { LoadingButton } from '@mui/lab'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { Input } from '@/ui-component/input/Input'

// Hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'

// API
import authApi from '@/api/auth'
import accountApi from '@/api/account.api'
import loginMethodApi from '@/api/loginmethod'
import ssoApi from '@/api/sso'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { loginSuccess, logoutSuccess } from '@/store/reducers/authSlice'
import { store } from '@/store'

// icons
import AzureSSOLoginIcon from '@/assets/images/microsoft-azure.svg'
import GoogleSSOLoginIcon from '@/assets/images/google.svg'
import Auth0SSOLoginIcon from '@/assets/images/auth0.svg'
import GithubSSOLoginIcon from '@/assets/images/github.svg'

// ==============================|| SignInPage ||============================== //

const SignInPage = () => {
    const theme = useTheme()
    useSelector((state) => state.customization)
    useNotifier()
    const { isEnterpriseLicensed, isCloud, isOpenSource } = useConfig()

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'email',
        placeholder: 'user@company.com'
    }
    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }
    const [usernameVal, setUsernameVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [configuredSsoProviders, setConfiguredSsoProviders] = useState([])
    const [authError, setAuthError] = useState(undefined)
    const [loading, setLoading] = useState(false)
    const [showResendButton, setShowResendButton] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [isBasicAuthEnabled, setIsBasicAuthEnabled] = useState(false)

    const loginApi = useApi(authApi.login)
    const ssoLoginApi = useApi(ssoApi.ssoLogin)
    const getDefaultProvidersApi = useApi(loginMethodApi.getDefaultLoginMethods)
    const getBasicAuthApi = useApi(accountApi.getBasicAuth)
    const checkBasicAuthApi = useApi(accountApi.checkBasicAuth)
    const navigate = useNavigate()
    const location = useLocation()
    const resendVerificationApi = useApi(accountApi.resendVerificationEmail)

    const doLogin = (event) => {
        event.preventDefault()
        setLoading(true)

        if (isBasicAuthEnabled) {
            // Use basic auth
            const body = {
                username: usernameVal,
                password: passwordVal
            }
            checkBasicAuthApi.request(body)
        } else {
            // Use regular user auth
            const body = {
                user: {
                    email: usernameVal,
                    credential: passwordVal
                }
            }
            loginApi.request(body)
        }
    }

    useEffect(() => {
        if (loginApi.error) {
            setLoading(false)
            const resp = loginApi.error.response
            if (resp?.status === 401 && resp?.data?.redirectUrl) {
                window.location.href = resp.data.data.redirectUrl
            } else {
                setAuthError(resp?.data?.message || loginApi.error.message)
            }
        }
    }, [loginApi.error])

    useEffect(() => {
        store.dispatch(logoutSuccess())
        if (!isOpenSource) {
            getDefaultProvidersApi.request()
        }
        // Check for basic auth on all platforms
        getBasicAuthApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        // Parse the "user" query parameter from the URL
        const queryParams = new URLSearchParams(location.search)
        const errorData = queryParams.get('error')
        if (!errorData) return
        const parsedErrorData = JSON.parse(decodeURIComponent(errorData))
        setAuthError(parsedErrorData.message)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search])

    useEffect(() => {
        if (loginApi.data) {
            setLoading(false)
            store.dispatch(loginSuccess(loginApi.data))
            navigate(location.state?.path || '/chatflows')
            //navigate(0)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginApi.data])

    useEffect(() => {
        if (ssoLoginApi.data) {
            store.dispatch(loginSuccess(ssoLoginApi.data))
            navigate(location.state?.path || '/chatflows')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ssoLoginApi.data])

    useEffect(() => {
        if (ssoLoginApi.error) {
            if (ssoLoginApi.error?.response?.status === 401 && ssoLoginApi.error?.response?.data.redirectUrl) {
                window.location.href = ssoLoginApi.error.response.data.redirectUrl
            } else {
                setAuthError(ssoLoginApi.error.message)
            }
        }
    }, [ssoLoginApi.error])

    // Handle basic auth check response
    useEffect(() => {
        if (getBasicAuthApi.data) {
            setIsBasicAuthEnabled(getBasicAuthApi.data.isUsernamePasswordSet)
        }
    }, [getBasicAuthApi.data])

    // Handle basic auth login response
    useEffect(() => {
        if (checkBasicAuthApi.data) {
            setLoading(false)
            // Check if the response contains user data (new session-based response)
            if (checkBasicAuthApi.data.id && checkBasicAuthApi.data.email) {
                // New format: actual user object returned from session establishment
                store.dispatch(loginSuccess(checkBasicAuthApi.data))
                navigate(location.state?.path || '/chatflows')
            } else if (checkBasicAuthApi.data.message === 'Authentication successful') {
                // Old format: just success message (fallback)
                const userData = {
                    id: 'basic-auth-user',
                    email: usernameVal,
                    name: usernameVal.split('@')[0], // Use part before @ as name
                    status: 'ACTIVE',
                    role: 'user',
                    isSSO: false,
                    isOrganizationAdmin: true, // For basic auth, grant admin access
                    token: 'basic-auth-token',
                    permissions: [],
                    features: {},
                    assignedWorkspaces: []
                }
                store.dispatch(loginSuccess(userData))
                navigate(location.state?.path || '/chatflows')
            } else {
                setAuthError('Authentication failed')
            }
        }
    }, [checkBasicAuthApi.data, usernameVal, navigate, location.state?.path])

    // Handle basic auth login error
    useEffect(() => {
        if (checkBasicAuthApi.error) {
            setLoading(false)
            setAuthError('Basic authentication failed')
        }
    }, [checkBasicAuthApi.error])

    useEffect(() => {
        if (getDefaultProvidersApi.data && getDefaultProvidersApi.data.providers && Array.isArray(getDefaultProvidersApi.data.providers)) {
            //data is an array of objects, store only the provider attribute
            setConfiguredSsoProviders(getDefaultProvidersApi.data.providers.map((provider) => provider))
        } else if (getDefaultProvidersApi.data && getDefaultProvidersApi.data.error) {
            // Handle error response from SSO providers API
            setConfiguredSsoProviders([])
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getDefaultProvidersApi.data])

    useEffect(() => {
        if (authError === 'User Email Unverified') {
            setShowResendButton(true)
        } else {
            setShowResendButton(false)
        }
    }, [authError])

    const signInWithSSO = (ssoProvider) => {
        window.location.href = `/api/v1/${ssoProvider}/login`
    }

    const handleResendVerification = async () => {
        try {
            await resendVerificationApi.request({ email: usernameVal })
            setAuthError(undefined)
            setSuccessMessage('Verification email has been sent successfully.')
            setShowResendButton(false)
        } catch (error) {
            setAuthError(error.response?.data?.message || 'Failed to send verification email.')
        }
    }

    return (
        <>
            <MainCard maxWidth='sm'>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {successMessage && (
                        <Alert variant='filled' severity='success' onClose={() => setSuccessMessage('')} role='alert' aria-live='polite'>
                            {successMessage}
                        </Alert>
                    )}
                    {authError && (
                        <Alert
                            icon={<IconExclamationCircle aria-hidden='true' />}
                            variant='filled'
                            severity='error'
                            role='alert'
                            aria-live='assertive'
                        >
                            {authError}
                        </Alert>
                    )}
                    {showResendButton && (
                        <Stack sx={{ gap: 1 }}>
                            <Button variant='text' onClick={handleResendVerification}>
                                Resend Verification Email
                            </Button>
                        </Stack>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Sign In</Typography>
                        {isCloud && (
                            <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                                Don&apos;t have an account?{' '}
                                <Link style={{ color: `${theme.palette.primary.main}` }} to='/register'>
                                    Sign up for free
                                </Link>
                                .
                            </Typography>
                        )}
                        {isEnterpriseLicensed && (
                            <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                                Have an invite code?{' '}
                                <Link style={{ color: `${theme.palette.primary.main}` }} to='/register'>
                                    Sign up for an account
                                </Link>
                                .
                            </Typography>
                        )}
                    </Stack>
                    {/* Debug indicator */}
                    <Stack sx={{ gap: 1, padding: 1, backgroundColor: '#f0f0f0', borderRadius: 1 }}>
                        <Typography variant='caption' sx={{ color: 'blue' }}>
                            Debug: Basic Auth {isBasicAuthEnabled ? 'ENABLED' : 'DISABLED'}
                        </Typography>
                    </Stack>
                    <form onSubmit={doLogin} aria-label='Sign in form'>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography component='label' htmlFor='username'>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={{
                                        ...usernameInput,
                                        label: 'Email address',
                                        required: true,
                                        id: 'username'
                                    }}
                                    onChange={(newValue) => setUsernameVal(newValue)}
                                    value={usernameVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box sx={{ p: 0 }}>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography component='label' htmlFor='password'>
                                        Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={{
                                        ...passwordInput,
                                        label: 'Password',
                                        required: true,
                                        id: 'password'
                                    }}
                                    onChange={(newValue) => setPasswordVal(newValue)}
                                    value={passwordVal}
                                />
                                <Typography variant='body2' sx={{ color: theme.palette.grey[600], mt: 1, textAlign: 'right' }}>
                                    <Link style={{ color: theme.palette.primary.main }} to='/forgot-password'>
                                        Forgot password?
                                    </Link>
                                </Typography>
                                {isCloud && (
                                    <Typography variant='body2' sx={{ color: theme.palette.grey[600], mt: 1, textAlign: 'right' }}>
                                        <a
                                            href='https://docs.flowiseai.com/migration-guide/cloud-migration'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            style={{ color: theme.palette.primary.main }}
                                        >
                                            Migrate from existing account?
                                        </a>
                                    </Typography>
                                )}
                            </Box>
                            <LoadingButton
                                loading={loading}
                                variant='contained'
                                style={{ borderRadius: 12, height: 40, marginRight: 5 }}
                                type='submit'
                                aria-label='Sign in to your account'
                                disabled={!usernameVal || !passwordVal}
                            >
                                Login
                            </LoadingButton>
                            {Array.isArray(configuredSsoProviders) && configuredSsoProviders.length > 0 && (
                                <Divider sx={{ width: '100%' }}>OR</Divider>
                            )}
                            {Array.isArray(configuredSsoProviders) &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        //https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps
                                        ssoProvider === 'azure' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={AzureSSOLoginIcon} alt={'MicrosoftSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Microsoft
                                            </Button>
                                        )
                                )}
                            {Array.isArray(configuredSsoProviders) &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'google' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={GoogleSSOLoginIcon} alt={'GoogleSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Google
                                            </Button>
                                        )
                                )}
                            {Array.isArray(configuredSsoProviders) &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'auth0' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={Auth0SSOLoginIcon} alt={'Auth0SSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Auth0 by Okta
                                            </Button>
                                        )
                                )}
                            {Array.isArray(configuredSsoProviders) &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'github' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={GithubSSOLoginIcon} alt={'GithubSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Github
                                            </Button>
                                        )
                                )}
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
        </>
    )
}

export default SignInPage
