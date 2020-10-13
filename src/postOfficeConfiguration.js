/* eslint no-unused-vars: 0 */

/*
  Injects a new UI into the Configure View of the web wallet.
*/

import React, { useState, useEffect } from 'react'
import {
  Content,
  Row,
  Col,
  Box,
  Inputs,
  Button,
  ButtonGroup
} from 'adminlte-2-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
const { Text, Select } = Inputs

export default () => {
  const [postOfficeUrl, setPostOfficeUrl] = useState()

  // Get the wallet information from LocalStorage
  const updatePostOfficeUrl = () => {
    const walletInfo = JSON.parse(
      window.localStorage.getItem('fullstack-wallet-info')
    )
    walletInfo.postOfficeUrl = postOfficeUrl
    window.localStorage.setItem(
      'fullstack-wallet-info',
      JSON.stringify(walletInfo)
    )
  }

  // Set the URL for the current Post Office server.
  const getPostOfficeUrl = () => {
    const walletInfo = JSON.parse(
      window.localStorage.getItem('fullstack-wallet-info')
    )
    return (
      walletInfo.postOfficeUrl || 'https://post-office.fullstack.cash/postage'
    )
  }

  useEffect(() => {
    const newPostOfficeUrl = getPostOfficeUrl()
    setPostOfficeUrl(newPostOfficeUrl)
  }, [])

  return (
    <Box className='hover-shadow border-none mt-2'>
      <Row>
        <Col sm={12} className='text-center'>
          <h1>
            <FontAwesomeIcon className='title-icon' size='xs' icon='message' />
            <span>Post Office</span>
          </h1>
          <Box className='border-none'>
            <Text
              id='postOffice'
              name='postOffice'
              placeholder='Enter a Post Office Url'
              label='Post Office Url'
              labelPosition='above'
              value={postOfficeUrl}
              onChange={e => setPostOfficeUrl(e.target.value)}
            />
            <Button
              text='Update'
              type='primary'
              className='btn-lg'
              onClick={() => updatePostOfficeUrl()}
            />
          </Box>
        </Col>
        <Col sm={12} className='text-center'>
          {/* {_this.state.errMsg && (
        <p className='error-color'>{_this.state.errMsg}</p>
        )} */}
        </Col>
      </Row>
    </Box>
  )
}
