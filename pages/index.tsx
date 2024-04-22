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
  const [safeAddresses, setSafeAddresses] = useState([] as string[])
  const [safeAddress, setSafeAddress] = useState("" as string)

  function connectToSafe() {
    if (account.address !== undefined && account.chainId !== undefined) {
      const chainId = BigInt(account.chainId)
      const safeAddresses = process.env.NEXT_PUBLIC_SAFE_ADDRESS
      if (safeAddresses !== undefined && !isConnected) {
        const safes = safeAddresses.split(",")
        console.log(safes)
        setSafeAddresses(safes)
        setSafeAddress(safes[0])
        const safeService = new SafeApiKit({ chainId })
        safeService.getSafeInfo(safes[0]).then(safeInfo => {
          setIsConnected(true)
          safeService.getSafeDelegates({ safeAddress: safes[0] }).then(delegateRes => {
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

  function changeSafeAddress(event: any) {
    const safeAddress = event.target.value
    setSafeAddress(safeAddress)
    if (account.address !== undefined && account.chainId !== undefined) {
      const chainId = BigInt(account.chainId)
      const safeService = new SafeApiKit({ chainId })
      safeService.getSafeDelegates({ safeAddress }).then(delegateRes => {
        const delegates = delegateRes.results.map(delegate => delegate.delegate)
        setDelegates(delegates)
        console.log("Found delegates:", delegates)
      }).catch(e => {
        console.log("Error getting delegates:", e.message)
      })
    }
  }

  function addDelegate() {
    const delegateAddress = document.getElementById('delegate-address') as HTMLInputElement
    const delegateLabel = document.getElementById('delegate-label') as HTMLInputElement
    console.log("Delegate address:", delegateAddress.value)
    if (account.address !== undefined && account.chainId !== undefined) {
      const chainId = BigInt(account.chainId)
      if (safeAddress !== undefined) {
        const safeService = new SafeApiKit({ chainId })
        safeService.getSafeInfo(safeAddress).then(safeInfo => {
          console.log(safeInfo)
          setIsConnected(true)
          const delegatorAddress = "0x" + account.address?.replace("0x", "")
          if (walletClient !== undefined) {
            const signer = walletClientToSigner(walletClient)
            if (signer !== undefined) {
              safeService.addSafeDelegate({ safeAddress, delegateAddress: delegateAddress.value, delegatorAddress, label: delegateLabel.value, signer }).then(delegateRes => {
                console.log("Delegator added.")
                safeService.getSafeDelegates({ safeAddress }).then(delegateRes => {
                  const delegates = delegateRes.results.map(delegate => delegate.delegate)
                  setDelegates(delegates)
                  console.log("Found delegates:", delegates)
                  delegateAddress.value = ""
                  delegateLabel.value = ""
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

  function removeDelegator(delegateAddress: string) {
    if (account.address !== undefined && account.chainId !== undefined) {
      const chainId = BigInt(account.chainId)
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
          <h2>Manage delegates</h2>
          <select id="safe-address" onChange={changeSafeAddress} className="input">
            {safeAddresses.map(safe => <option key={safe} value={safe}>{safe}</option>)}
          </select>
          <h3>Delegates: {delegates.length}</h3>
          {delegates.map(delegate => <div className='delegates' key={delegate}>
            {delegate}
            <button onClick={() => removeDelegator(delegate)} className="remove">🗑️</button>
          </div>)}
          <input type="text" id="delegate-address" className="input" placeholder="Delegate address" />
          <input type="text" id="delegate-label" className="input" placeholder="Delegate label" />
          <button onClick={addDelegate} className="button">Add delegator</button>
        </div>}
        {!isConnected && <div>
          <h2>Connect to Safe first</h2>
          <button onClick={connectToSafe} className="button">Connect to Safe</button>
        </div>}
      </main >

    </div >
  );
};

export default Home;
