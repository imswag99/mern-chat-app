import React, { useContext } from 'react'
import { UserContext } from '../../context/UserContext'
import RegisterAndLogin from './RegisterAndLogin';
import Chat from './Chat';

const Routes = () => {
  const { id, username } = useContext(UserContext);

  if(username) {
    return <Chat />;
  }

  return (
    <RegisterAndLogin />
  )
}

export default Routes