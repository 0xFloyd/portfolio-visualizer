import React, { useMemo, useState } from 'react'
import { Pressable } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { StackNavigationProp } from '@react-navigation/stack'
import { useNavigation } from '@react-navigation/native'
import { RootStackParamList } from '../types/types'
import Button from '../components/ui/Button'
import { YStack, XStack, Text, TextArea, View, Input } from 'tamagui'
import { walletFromMnemonic, walletFromPrivateKey } from '../providers/ethers'
import { actions } from '../store/appStore'
import InlineNotice from '../components/ui/InlineNotice'
import Screen from '../components/ui/Screen'
import Footer from '../components/ui/Footer'
import SegmentedOptions from '../components/ui/SegmentedOptions'
import AddressInput from '../components/ui/AddressInput'

export default function ImportSeedScreen() {
  const [seed, setSeed] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [walletGenerationError, setWalletGenerationError] = useState('')
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  type ImportMethod = 'seed12' | 'seed24' | 'privateKey'
  const [method, setMethod] = useState<ImportMethod>('seed12')

  const canContinue = useMemo(() => {
    if (method === 'privateKey') {
      const pk = privateKey.trim()
      return pk.length > 0 && pk.toLowerCase().startsWith('0x')
    }
    const words = seed.trim().split(/\s+/).filter(Boolean)
    return method === 'seed12' ? words.length === 12 : words.length === 24
  }, [method, seed, privateKey])

  async function validateInput(): Promise<{ address?: string; error?: string }> {
    try {
      if (method === 'privateKey') {
        const wallet = walletFromPrivateKey(privateKey.trim())
        const addr = wallet.address
        if (!addr || addr.length !== 42) return { error: 'Invalid private key' }
        return { address: addr }
      }
      const words = seed.trim().split(/\s+/).filter(Boolean)
      if (method === 'seed12' && words.length !== 12) return { error: 'Seed must be 12 words' }
      if (method === 'seed24' && words.length !== 24) return { error: 'Seed must be 24 words' }
      const wallet = walletFromMnemonic(seed.trim())
      const addr = wallet.address
      if (!addr || addr.length !== 42) return { error: 'Invalid seed phrase' }
      return { address: addr }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to import wallet. Check your input.'
      return { error: msg }
    }
  }

  async function handleContinue() {
    setWalletGenerationError('')
    const { address, error } = await validateInput()
    if (error || !address) {
      setWalletGenerationError(error || 'Invalid input')
      return
    }
    // Build the ephemeral signer in-memory and store it for this session only
    try {
      const wallet = method === 'privateKey' ? walletFromPrivateKey(privateKey.trim()) : walletFromMnemonic(seed.trim())
      actions.setEphemeralWallet(wallet)
    } catch {}
    actions.setMode('full')
    actions.setAddress(address)
    actions.loadPortfolio(address)
    navigation.reset({ index: 0, routes: [{ name: 'Portfolio', params: { address, mode: 'full' } }] })
  }

  return (
    <Screen gap="$2" p="$4">
      <YStack f={1} gap="$4">
        <View style={{ height: 48, justifyContent: 'center' }}>
          <Pressable
            onPress={() => navigation.navigate('Entry')}
            hitSlop={10}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={26} />
          </Pressable>
        </View>
        <YStack gap="$3" px={36}>
          <XStack alignSelf="center" ai="center" jc="center" gap="$2" bg="$badge" p={8} borderRadius={8}>
            <Ionicons name="documents" size={20} color="black" />
          </XStack>
          <Text style={{ textAlign: 'center' }} fontSize={18} fontWeight={500}>
            Enter your recovery phrase
          </Text>
          <Text style={{ textAlign: 'center' }} color="#6b7280">
            Your recovery phrase will only be stored locally on your device.
          </Text>
        </YStack>

        <SegmentedOptions
          options={[
            { value: 'seed12', label: '12 words' },
            { value: 'seed24', label: '24 words' },
            { value: 'privateKey', label: 'Private key' }
          ]}
          value={method}
          onChange={(v) => {
            setMethod(v as ImportMethod)
            setWalletGenerationError('')
          }}
        />

        {method === 'privateKey' ? (
          <AddressInput
            value={privateKey}
            onChangeText={(t) => {
              setPrivateKey(t)
              if (walletGenerationError) setWalletGenerationError('')
            }}
            placeholder="Enter 0x-prefixed private key"
          />
        ) : (
          <TextArea
            value={seed}
            onChangeText={(t) => {
              setSeed(t)
              if (walletGenerationError) setWalletGenerationError('')
            }}
            placeholder={
              method === 'seed12' ? 'Type or paste your 12-word phrase' : 'Type or paste your 24-word phrase'
            }
            multiline
          />
        )}
      </YStack>
      <Footer>
        <YStack gap="$2">
          <Button disabled={!canContinue} accent onPress={handleContinue} opacity={canContinue ? 1 : 0.5}>
            Continue
          </Button>
          {!!walletGenerationError && <InlineNotice variant="error">{walletGenerationError}</InlineNotice>}
        </YStack>
      </Footer>
    </Screen>
  )
}
