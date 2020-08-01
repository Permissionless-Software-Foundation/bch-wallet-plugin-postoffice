import React from 'react'
import PropTypes from 'prop-types'
import { Row, Col, Box, Inputs, Button } from 'adminlte-2-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import axios from 'axios';
import BigNumber from 'bignumber.js'
import PaymentProtocol from 'bitcore-payment-protocol'
// import BchWallet from 'minimal-slp-wallet'
import ScannerModal from 'gatsby-ipfs-web-wallet/src/components/qr-scanner/modal'

const slpjs = require('slpjs');

const { Text } = Inputs

const BchWallet =
typeof window !== 'undefined'
  ? window.SlpWallet
  : null

let _this
class SendTokens extends React.Component {
  constructor (props) {
    super(props)

    _this = this

    this.state = {
      address: '',
      amountSat: '',
      errMsg: '',
      txId: '',
      showScan: false,
      inFetch: false,
      postageRate: false,
      postOffice: false,
      postOfficeUrl: false,
      merchantData: false,
    }
    _this.BchWallet = BchWallet
  }

  handlePostageRateRequest = async (postOfficeUrl) => {
    try {
        const response = await axios.get(`${postOfficeUrl}`, { headers: {
            "Content-Type": "application/simpleledger-payment",
        }});
        return response.data
    } catch(e) {
        console.error("Error getting postage rate: ", e.message);
        return false;
    }
 }

  async componentDidMount() {
        const walletInfo = JSON.parse(window.localStorage.getItem('fullstack-wallet-info'))
        if (walletInfo.postOfficeUrl) {
          _this.setState({ postOfficeUrl: walletInfo.postOfficeUrl });
            const postageRateResponse = await this.handlePostageRateRequest(walletInfo.postOfficeUrl)
            if (postageRateResponse) {
                const postageRate = postageRateResponse.stamps.filter(stamp => stamp.tokenId === _this.props.selectedToken.tokenId);
                if(postageRate.length > 0) {
                    _this.setState({ postageRate: postageRate[0]})
                    _this.setState({ merchantData: postageRateResponse })
                }
            }
            
        }
  }

  render () {
    const { name } = _this.props.selectedToken
    return (
      <>
        <Row>
          <Col sm={12}>
            <Box className=' border-none mt-2' loaded={!this.state.inFetch}>
              <Row>
                <Col sm={12} className='text-center'>
                  <h1 id='SendTokens'>
                    <FontAwesomeIcon
                      className='title-icon'
                      size='xs'
                      icon='paper-plane'
                    />
                    <span>Send</span>
                  </h1>

                  <Box className='border-none'>
                    <Text
                      id='addressToSend'
                      name='address'
                      placeholder='Enter simpleledger address to send'
                      label='SLP Address'
                      labelPosition='above'
                      onChange={_this.handleUpdate}
                      className='title-icon'
                      buttonRight={
                        <Button icon='fa-qrcode' onClick={_this.handleModal} />
                      }
                    />

                    <Text
                      id='amountToSend'
                      name='amountSat'
                      placeholder='Enter amount to send'
                      label='Amount'
                      labelPosition='above'
                      onChange={_this.handleUpdate}
                    />
                    {_this.state.postageRate && <label className='switch-address' style={{ margin: '0 auto', display: 'block'}}htmlFor='address-checkbox'>
                        <p>{_this.state.postOffice ? 'Enable' : 'Disable'} Post Office</p><input
                          id='address-checkbox'
                          type='checkbox'
                          
                          onChange={() => _this.setState({ postOffice: !_this.state.postOffice })}
                        />
                        <span className='slider round' />
                      </label>}
                    <Button
                      text='Close'
                      type='primary'
                      className='btn-lg mr-2'
                      onClick={_this.props.handleBack}
                    />
                    <Button
                      text='Send'
                      type='primary'
                      className='btn-lg '
                      onClick={_this.handleSend}
                    />
                  </Box>
                </Col>
                <Col sm={12} className='text-center'>
                  {_this.state.errMsg && (
                    <p className='error-color'>{_this.state.errMsg}</p>
                  )}
                  {_this.state.txId && (
                    <p className=''>
                      Transaction ID:
                      <a
                        target='_blank'
                        rel='noopener noreferrer'
                        href={`https://explorer.bitcoin.com/bch/tx/${_this.state.txId}`}
                      >
                        {_this.state.txId}
                      </a>
                    </p>
                  )}
                  {name && (
                    <span>
                      Selected Token : <b>{name}</b>
                    </span>
                  )}
                  {_this.state.postOffice && <p>Post Office Enabled!</p>}
                  {_this.state.postageRate && _this.state.postOffice && <p>Rate: {(new BigNumber(_this.state.postageRate.rate) / Math.pow(10, _this.state.postageRate.decimals)).toFixed(_this.state.postageRate.decimals)} {_this.state.postageRate.symbol}</p>}
                </Col>
              </Row>
            </Box>
          </Col>
        </Row>
        <ScannerModal
          show={_this.state.showScan}
          handleOnHide={_this.onHandleToggleScanner}
          handleOnScan={_this.onHandleOnScan}
        />
      </>
    )
  }

  handleUpdate (event) {
    const value = event.target.value
    _this.setState({
      [event.target.name]: value
    })
    // console.log(_this.state)
  }

  async handleSend () {
    try {
      _this.setState({
        txId: '',
        inFetch: true
      })
      _this.validateInputs()

      const bchWalletLib = _this.props.bchWallet
      const { address, amountSat } = _this.state
      const { tokenId, qty } = _this.props.selectedToken

      if (!tokenId) {
        throw new Error('There is no token selected')
      }
      const receiver = {
        address,
        tokenId,
        qty: Math.floor(Number(amountSat))
      }
      
      if (!bchWalletLib) {
        throw new Error('Wallet not found')
      }

      if (qty < receiver.qty) {
        throw new Error('Insufficient balance')
      }
      // console.log('receiver', receiver)
      // Ensure the wallet UTXOs are up-to-date.
      const walletAddr = bchWalletLib.walletInfo.address
      await bchWalletLib.utxos.initUtxoStore(walletAddr)

      // For some reason, the utxo categories do not get populated, so we have
      // to do it manually.
      bchWalletLib.utxos.bchUtxos = await bchWalletLib.utxos.getBchUtxos()
      bchWalletLib.utxos.tokenUtxos = await bchWalletLib.utxos.getTokenUtxos()

      // Send token.
      let result
      if (_this.state.postOffice) {
        result = await _this.sendThroughPostOffice(amountSat, address, tokenId, qty)
      } else {
        result = await bchWalletLib.sendTokens(receiver, 5.0)
      }
      console.log('result: ', result)

      _this.setState({
        txId: result,
        inFetch: false
      })

      _this.resetValues()
      setTimeout(() => {
        _this.props.handleSend()
      }, 1000)
    } catch (error) {
      _this.handleError(error)
    }
  }

  async sendThroughPostOffice(amount, outputAddress) {
    try {
        //const minimalBCHWallet = await new MinimalBCHWallet(walletInfo.mnemonic);
        console.log('Creating custom transaction...')
        console.log(_this.props.selectedToken.tokenId);
        const walletInfo = _this.props.bchWallet.walletInfo
        const slpUtxos = _this.props.bchWallet.utxos.tokenUtxos
        const tokenId =  _this.props.selectedToken.tokenId
        console.log(`SLP UTXOS`, slpUtxos);
        const slpUtxosFromTokenId = slpUtxos.filter(slpUtxo => slpUtxo.tokenId === tokenId); // && slpUtxo.tokenQty > amount
        const transactionBuilder = new _this.props.bchWallet.bchjs.TransactionBuilder();
        console.log(`Adding SLP inputs`);
        const slpInputUtxo = slpUtxosFromTokenId.filter(slpUtxo => slpUtxo.tokenQty > amount).pop();
    
        console.log(`Add SLP outputs`);
        const postageRate = new BigNumber(_this.state.postageRate.rate / (10 ** _this.state.postageRate.decimals)).times(10 ** (slpUtxosFromTokenId[0].decimals)).times(4);
        console.log('postage rate', postageRate);
        const tokenQty = new BigNumber(slpInputUtxo.tokenQty).times(10 ** slpUtxosFromTokenId[0].decimals);
        const amountToSend = new BigNumber(amount).times(10 ** slpUtxosFromTokenId[0].decimals);
        const change = tokenQty.minus(amountToSend).minus(postageRate);
        const outputQtyArray = (change === 0) ? [new BigNumber(amountToSend), new BigNumber(postageRate)] : [new BigNumber(amountToSend), new BigNumber(postageRate), new BigNumber(change)]
        const slpSendOpReturn = slpjs.Slp.buildSendOpReturn(
          { tokenIdHex: tokenId, outputQtyArray: outputQtyArray }
      );


        console.log(`SLP_SEND_OP_RETURN`, slpSendOpReturn);
        transactionBuilder.addOutput(slpSendOpReturn, 0);
        
       // Send dust transaction representing tokens being sent.
       transactionBuilder.addOutput(
           _this.props.bchWallet.bchjs.SLP.Address.toLegacyAddress(outputAddress),
           546
       )

       if (_this.state.postageRate.rate > 0) {
        transactionBuilder.addOutput(
            _this.props.bchWallet.bchjs.SLP.Address.toLegacyAddress(_this.state.merchantData.address),
            546
        )
       }

      // Return any token change back to the sender.
      if (!change.isLessThanOrEqualTo(0)) {
        transactionBuilder.addOutput(
          _this.props.bchWallet.bchjs.SLP.Address.toLegacyAddress(walletInfo.address),
          546
        )
      }

      console.log(`Signing SLP inputs`);
      transactionBuilder.addInput(slpInputUtxo.tx_hash, slpInputUtxo.tx_pos);
      const seed = await _this.props.bchWallet.bchjs.Mnemonic.toSeed(walletInfo.mnemonic);
      console.log(`seed`, seed);
      const hdNode = await _this.props.bchWallet.bchjs.HDNode.fromSeed(seed);
      const bip44BCHAccount = _this.props.bchWallet.bchjs.HDNode.derivePath(hdNode, "m/44'/245'/0'");
      const changeAddressNode0 = _this.props.bchWallet.bchjs.HDNode.derivePath(bip44BCHAccount, '0/0');
      console.log(`Address`, _this.props.bchWallet.bchjs.HDNode.toCashAddress(changeAddressNode0))
      const keyPair = _this.props.bchWallet.bchjs.HDNode.toKeyPair(changeAddressNode0);
      console.log(`keyPair`, keyPair);
      transactionBuilder.sign(0, keyPair, undefined, transactionBuilder.hashTypes.SIGHASH_ALL | transactionBuilder.hashTypes.SIGHASH_ANYONECANPAY, slpInputUtxo.satoshis,  transactionBuilder.signatureAlgorithms.ECDSA);
      
      const incompleteTx = transactionBuilder.transaction.buildIncomplete();
      console.log(`Incomplete tx: `, incompleteTx);
      
      const payment = new PaymentProtocol().makePayment();
      payment.set('merchant_data', Buffer.from(JSON.stringify(_this.state.merchantData)));
      payment.set('transactions', [Buffer.from(incompleteTx.toHex(), 'hex')])
      var outputs = new PaymentProtocol().makeOutput();
      outputs.set('amount', 0);
      outputs.set('script', Buffer.from(incompleteTx.outs[1].script));
      payment.set('refund_to', outputs.message);
      const rawbody = payment.serialize()
      const headers = {
        Accept:
          'application/simpleledger-paymentrequest, application/simpleledger-paymentack, application/json',
        'Content-Type': 'application/simpleledger-payment',
        'Content-Transfer-Encoding': 'binary',
      }
      const response = await axios.post(
        _this.state.postOfficeUrl,
        rawbody,
        {
          headers,
        }
      )

     console.log(`Response Data: `, response);
     let transactions = await _this.props.bchWallet.bchjs.Electrumx.transactions(walletInfo.address);
     console.log('transactions', transactions)
    
    } catch (e) {
        console.error(`Error from FullStack.cash api`, e);
    }
}

  // Reset form and component state
  resetValues () {
    _this.setState({
      address: '',
      amountSat: '',
      errMsg: ''
    })
    const amountEle = document.getElementById('amountToSend')
    amountEle.value = ''

    const addressEle = document.getElementById('addressToSend')
    addressEle.value = ''
  }

  validateInputs () {
    const { address, amountSat } = _this.state
    const amountNumber = Number(amountSat)

    if (!address) {
      throw new Error('Address is required')
    }

    if (!amountSat) {
      throw new Error('Amount is required')
    }

    if (!amountNumber) {
      throw new Error('Amount must be a number')
    }

    if (amountNumber < 0) {
      throw new Error('Amount must be greater than zero')
    }
  }

  onHandleToggleScanner () {
    _this.setState({
      showScan: !_this.state.showScan
    })
  }

  handleModal () {
    _this.setState({
      showScan: !_this.state.showScan
    })
  }

  resetAddressValue () {
    _this.setState({
      address: '',
      errMsg: ''
    })
    const addressEle = document.getElementById('addressToSend')
    addressEle.value = ''
  }

  onHandleOnScan (data) {
    const validateAdrrs = ['simpleledger']
    try {
      _this.resetAddressValue()
      if (!data) {
        throw new Error('No Result!')
      }
      if (typeof data !== 'string') {
        throw new Error('It should scan a bch address or slp address')
      }
      // Validates that the words "bitcoincash" or "simpleledger" are contained
      let isValid = false
      for (let i = 0; i < validateAdrrs.length; i++) {
        isValid = isValid ? true : data.match(validateAdrrs[i])
        if (isValid) {
          _this.setState({
            address: data,
            errMsg: ''
          })
          const addressEle = document.getElementById('addressToSend')
          addressEle.value = data
        }
      }
      if (!isValid) {
        throw new Error('It should scan a bch address or slp address')
      }
      _this.onHandleToggleScanner()
    } catch (error) {
      _this.onHandleToggleScanner()
      _this.setState({
        errMsg: error.message
      })
    }
  }

  handleError (error) {
    // console.error(error)
    let errMsg = ''
    if (error.message) {
      errMsg = error.message
    }
    if (error.error) {
      if (error.error.match('rate limits')) {
        errMsg = (
          <span>
            Rate limits exceeded, increase rate limits with a JWT token from
            <a
              style={{ marginLeft: '5px' }}
              target='_blank'
              href='https://fullstack.cash'
              rel='noopener noreferrer'
            >
              FullStack.cash
            </a>
          </span>
        )
      } else {
        errMsg = error.error
      }
    }
    _this.setState(prevState => {
      return {
        ...prevState,
        errMsg,
        txId: '',
        inFetch: false
      }
    })
  }
}
SendTokens.propTypes = {
  walletInfo: PropTypes.object.isRequired, // wallet info
  bchWallet: PropTypes.object, // get minimal-slp-wallet instance
  selectedToken: PropTypes.object,
  handleBack: PropTypes.func.isRequired,
  handleSend: PropTypes.func.isRequired
}
export default SendTokens
