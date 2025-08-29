import { useRef } from 'react'
import { ascii } from '../ascii'

const PrintAscii = () => {
  const printed = useRef(true)
  if (printed.current) {
    console.log(`%c${ascii}`, 'color: #00e100')
    console.log('%cThanks for stopping by', 'color: #00e100; font-size: 24px')
    printed.current = false
  }
  return null
}

export default PrintAscii
