import React, { useMemo, useState } from 'react'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StackNavigationProp } from '@react-navigation/stack'
import { useNavigation } from '@react-navigation/native'
import { RootStackParamList } from '../types/types'

import Button from '../components/ui/Button'
import { YStack, XStack, Text, TextArea, View, Input } from 'tamagui'
import { walletFromMnemonic, walletFromPrivateKey } from '../providers/ethers'
import { actions } from '../store/appStore'

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
    <YStack gap="$2" flex={1} p="$2">
      <View style={{ height: 48, justifyContent: 'center' }}>
        <Pressable
          onPress={() => navigation.navigate('Entry')}
          hitSlop={10}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={26} />
        </Pressable>
      </View>
      <Text text="center" fontSize={24}>
        Import wallet
      </Text>
      <Text text="center" color="#6b7280">
        Your recovery phrase will only be stored locally on your device.
      </Text>

      {/* Tabs */}
      <XStack gap="$2">
        <Pressable
          onPress={() => {
            setMethod('seed12')
            setWalletGenerationError('')
          }}
          style={{ flex: 1 }}
          hitSlop={10}
        >
          <View
            style={{
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: method === 'seed12' ? '#111827' : '#e5e7eb',
              backgroundColor: method === 'seed12' ? '#111827' : 'transparent'
            }}
          >
            <Text color={method === 'seed12' ? 'white' : '#111827'} text="center">
              12 words
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            setMethod('seed24')
            setWalletGenerationError('')
          }}
          style={{ flex: 1 }}
          hitSlop={10}
        >
          <View
            style={{
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: method === 'seed24' ? '#111827' : '#e5e7eb',
              backgroundColor: method === 'seed24' ? '#111827' : 'transparent'
            }}
          >
            <Text color={method === 'seed24' ? 'white' : '#111827'} text="center">
              24 words
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            setMethod('privateKey')
            setWalletGenerationError('')
          }}
          style={{ flex: 1 }}
          hitSlop={10}
        >
          <View
            style={{
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: method === 'privateKey' ? '#111827' : '#e5e7eb',
              backgroundColor: method === 'privateKey' ? '#111827' : 'transparent'
            }}
          >
            <Text color={method === 'privateKey' ? 'white' : '#111827'} text="center">
              Private key
            </Text>
          </View>
        </Pressable>
      </XStack>

      {/* Inputs */}
      {method === 'privateKey' ? (
        <Input
          value={privateKey}
          onChangeText={(t) => {
            setPrivateKey(t)
            if (walletGenerationError) setWalletGenerationError('')
          }}
          placeholder="Enter 0x-prefixed private key"
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : (
        <TextArea
          value={seed}
          onChangeText={(t) => {
            setSeed(t)
            if (walletGenerationError) setWalletGenerationError('')
          }}
          placeholder={method === 'seed12' ? 'Type or paste your 12-word phrase' : 'Type or paste your 24-word phrase'}
          multiline
        />
      )}
      <Button
        rounded="$4"
        disabled={!canContinue}
        background="#FC72FF"
        color="white"
        onPress={handleContinue}
        style={{ opacity: canContinue ? 1 : 0.5, backgroundColor: '#111827', padding: 12, borderRadius: 8 }}
      >
        Continue
      </Button>
      {!!walletGenerationError && (
        <View
          style={{
            borderWidth: 1,
            borderColor: '#fecaca',
            backgroundColor: '#fef2f2',
            padding: 10,
            borderRadius: 8
          }}
        >
          <Text color="#ef4444" text="center">
            {walletGenerationError}
          </Text>
        </View>
      )}
    </YStack>
  )
}
