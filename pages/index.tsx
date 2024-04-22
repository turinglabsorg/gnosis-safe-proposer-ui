import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import { useAccount, useWalletClient } from 'wagmi';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import SafeApiKit from '@safe-global/api-kit'
import { useEffect, useState } from 'react';
import { WalletClient } from 'viem';
import { BrowserProvider, JsonRpcSigner } from 'ethers'

const Home: NextPage = () => {
  const account = useAccount();
  const { data: walletClient } = useWalletClient({ chainId: account.chainId })
  const [isConnected, setIsConnected] = useState(false)
  const [delegates, setDelegates] = useState([] as string[])

  if (account.address !== undefined && account.chainId !== undefined) {
    const chainId = BigInt(account.chainId)
    const safeAddress = process.env.NEXT_PUBLIC_SAFE_ADDRESS
    if (safeAddress !== undefined && !isConnected) {
      const safeService = new SafeApiKit({ chainId })
      safeService.getSafeInfo(safeAddress).then(safeInfo => {
        setIsConnected(true)
        safeService.getSafeDelegates({ safeAddress }).then(delegateRes => {
          const delegates = delegateRes.results.map(delegate => delegate.delegate)
          setDelegates(delegates)
          console.log("Found delegates:", delegates)
        }).catch(e => {
          console.log("Error getting delegates:", e.message)
        })
      }).catch(e => {
        console.log("Error getting Safe info:", e.message)
      })
    }
  }

  function walletClientToSigner(walletClient: WalletClient) {
    const { account, chain, transport } = walletClient
    if (account !== undefined) {
      const network = {
        chainId: chain?.id,
        name: chain?.name,
        ensAddress: chain?.contracts?.ensRegistry?.address,
      }
      const provider = new BrowserProvider(transport, network)
      const signer = new JsonRpcSigner(provider, account.address)
      return signer
    }
  }

  async function addDelegator() {
    const delegateAddress = document.getElementById('delegator-address') as HTMLInputElement
    console.log("Delegator address:", delegateAddress.value)
    if (account.address !== undefined && account.chainId !== undefined) {
      const chainId = BigInt(account.chainId)
      const safeAddress = process.env.NEXT_PUBLIC_SAFE_ADDRESS
      if (safeAddress !== undefined) {
        const safeService = new SafeApiKit({ chainId })
        safeService.getSafeInfo(safeAddress).then(safeInfo => {
          console.log(safeInfo)
          setIsConnected(true)
          const delegatorAddress = "0x" + account.address?.replace("0x", "")
          if (walletClient !== undefined) {
            const signer = walletClientToSigner(walletClient)
            if (signer !== undefined) {
              safeService.addSafeDelegate({ safeAddress, delegateAddress: delegateAddress.value, delegatorAddress, label: "test", signer }).then(delegateRes => {
                console.log("Delegator added.")
                safeService.getSafeDelegates({ safeAddress }).then(delegateRes => {
                  const delegates = delegateRes.results.map(delegate => delegate.delegate)
                  setDelegates(delegates)
                  console.log("Found delegates:", delegates)
                  delegateAddress.value = ""
                }).catch(e => {
                  console.log("Error getting delegates:", e.message)
                })
              })
            }
          }
        })
      }
    }
  }

  async function removeDelegator(delegateAddress: string) {
    if (account.address !== undefined && account.chainId !== undefined) {
      const chainId = BigInt(account.chainId)
      const safeAddress = process.env.NEXT_PUBLIC_SAFE_ADDRESS
      if (safeAddress !== undefined) {
        const safeService = new SafeApiKit({ chainId })
        safeService.getSafeInfo(safeAddress).then(safeInfo => {
          console.log(safeInfo)
          setIsConnected(true)
          const delegatorAddress = "0x" + account.address?.replace("0x", "")
          if (walletClient !== undefined) {
            const signer = walletClientToSigner(walletClient)
            if (signer !== undefined) {
              safeService.removeSafeDelegate({ delegateAddress: delegateAddress, delegatorAddress, signer }).then(delegateRes => {
                console.log("Delegate removed.")
                safeService.getSafeDelegates({ safeAddress }).then(delegateRes => {
                  const delegates = delegateRes.results.map(delegate => delegate.delegate)
                  setDelegates(delegates)
                  console.log("Found delegates:", delegates)
                }).catch(e => {
                  console.log("Error getting delegates:", e.message)
                })
              })
            }
          }
        })
      }
    }
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Safe Delegator UI</title>
        <meta
          content="Safe Delegator UI"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <main className={styles.main}>
        <ConnectButton />
        {isConnected && <div>
          <h2>Connected to Safe Correctly</h2>
          <h3>Delegates: {delegates.length}</h3>
          {delegates.map(delegate => <div className='delegates' key={delegate}>
            {delegate}
            <button onClick={() => removeDelegator(delegate)} className="remove">🗑️</button>
          </div>)}
          <input type="text" id="delegator-address" className="input" placeholder="Delegator address" />
          <button onClick={addDelegator} className="button">Add delegator</button>
        </div>}
        {!isConnected && <h2>Not connected to Safe</h2>}
      </main>

    </div>
  );
};

export default Home;
