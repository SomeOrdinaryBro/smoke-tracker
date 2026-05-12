import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('VAPID Public Key:')
console.log(keys.publicKey)
console.log()
console.log('VAPID Private Key:')
console.log(keys.privateKey)
console.log()
console.log('Save the private key somewhere safe (e.g. a password manager).')
console.log('Put the public key in VITE_VAPID_PUBLIC_KEY and your Worker secrets.')
