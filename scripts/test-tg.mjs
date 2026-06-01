// test-tg.mjs
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const token = "8732752473:AAEpW60EU2RFG6LBidIFL4qq7mwQSrcvyso"
const originalId = "1003743469927"

async function testChat(chatId) {
  console.log(`Testing chat ID: ${chatId}...`)
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`)
    const data = await res.json()
    if (res.ok && data.ok) {
      console.log(`✅ Success for ${chatId}! Chat info:`, data.result)
      return true
    } else {
      console.log(`❌ Failed for ${chatId}:`, data.description)
      return false
    }
  } catch (err) {
    console.error(`💥 Error testing ${chatId}:`, err)
    return false
  }
}

async function main() {
  const idsToTest = [
    originalId,
    `-${originalId}`,
    `-100${originalId}`,
  ]

  for (const id of idsToTest) {
    const ok = await testChat(id)
    if (ok) {
      console.log(`\n🎉 Correct Chat ID is: ${id}`)
      break
    }
  }
}

main()
