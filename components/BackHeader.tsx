import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

type Props = {
  title?: string
  onBack?: () => void
  right?: React.ReactNode
}

export default function BackHeader({ title, onBack, right }: Props) {
  const navigation = useNavigation<any>()
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigation.goBack()
    }
  }
  return (
    <View
      style={{
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <Pressable
        onPress={handleBack}
        hitSlop={10}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="chevron-back" size={26} />
      </Pressable>
      {title ? <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text> : <View style={{ width: 44 }} />}
      <View style={{ width: 44 }}>{right}</View>
    </View>
  )
}
