import React, { FunctionComponent, useState } from 'react'
import { useAccount, useSubscription } from '../../../hooks'
import {
  abundance as abundanceContract,
  crowdfund as crowdfundContract,
} from '../../../shared/contracts'
import { Utils } from '../../../shared/utils'
import { Card, ConnectButton, Loading, ProgressBar } from '../../atoms'
import { Spacer } from '../../atoms/spacer'
import styles from './style.module.css'

import { scValToNative, xdr } from '@stellar/stellar-sdk'
import { Deposits, FormPledge } from '../../molecules'

const Pledge: FunctionComponent = () => {
  const [updatedAt, setUpdatedAt] = React.useState<number>(Date.now())
  const { account, isLoading, onConnect } = useAccount()

  const [abundance, setAbundance] = React.useState<{
    balance: bigint
    decimals: number
    name: string
    symbol: string
  }>()

  const [crowdfund, setCrowdfund] = React.useState<{
    deadline: Date
    target: bigint
  }>()

  React.useEffect(() => {
    ;(async () => {
      const balance = await abundanceContract.balance({
        id: crowdfundContract.options.contractId,
      })
      const decimals = await abundanceContract.decimals()
      const name = await abundanceContract.name()
      const symbol = await abundanceContract.symbol()
      const deadline = await crowdfundContract.deadline()
      const target = await crowdfundContract.target()
      setAbundance({
        balance: balance.result,
        decimals: decimals.result,
        name: name.result.toString(),
        symbol: symbol.result.toString(),
      })
      setCrowdfund({
        deadline: new Date(Number(deadline.result) * 1000),
        target: target.result,
      })
    })()
  }, [updatedAt])

  const [targetReached, setTargetReached] = useState<boolean>(false)

  useSubscription(
    crowdfundContract.options.contractId,
    'pledged_amount_changed',
    React.useMemo(
      () => (event) => {
        const eventTokenBalance = event.value
        setAbundance({
          ...abundance!,
          balance: scValToNative(eventTokenBalance),
        })
      },
      [abundance]
    )
  )

  useSubscription(
    crowdfundContract.options.contractId,
    'target_reached',
    React.useMemo(
      () => () => {
        setTargetReached(true)
      },
      []
    )
  )

  return (
    <Card>
      {!abundance || !crowdfund ? (
        <Loading size={64} />
      ) : (
        <>
          {targetReached && <h6>SUCCESSFUL CAMPAIGN !!</h6>}
          <h6>PLEDGED</h6>
          <div className={styles.pledgeAmount}>
            {Utils.formatAmount(abundance.balance, abundance.decimals)} {abundance.symbol}
          </div>
          <span className={styles.pledgeGoal}>{`of ${Utils.formatAmount(
            crowdfund.target,
            abundance.decimals
          )} ${abundance.symbol} goal`}</span>
          <ProgressBar
            value={Utils.percentage(abundance.balance, crowdfund.target, abundance.decimals)}
          />
          <div className={styles.wrapper}>
            <div>
              <h6>Time remaining</h6>
              <span className={styles.values}>{Utils.getRemainingTime(crowdfund.deadline)}</span>
            </div>
            <div>
              <h6>Backers</h6>
              <span className={styles.values}>976</span>
            </div>
          </div>
          <Spacer rem={1.5} />
          {!Utils.isExpired(crowdfund.deadline) &&
            (account ? (
              <FormPledge
                decimals={abundance.decimals || 7}
                account={account.address}
                symbol={abundance.symbol}
                updatedAt={updatedAt}
                onPledge={() => setUpdatedAt(Date.now())}
              />
            ) : (
              <ConnectButton
                label="Connect wallet to pledge"
                isHigher={true}
                isLoading={isLoading}
                onClick={onConnect}
              />
            ))}
          {account && (
            <Deposits
              address={account.address}
              decimals={abundance.decimals || 7}
              name={abundance.name}
              symbol={abundance.symbol}
            />
          )}
        </>
      )}
    </Card>
  )
}

export { Pledge }
