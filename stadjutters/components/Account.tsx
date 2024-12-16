import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StyleSheet, View, Alert, Text } from 'react-native'
import { Button, Input } from '@rneui/themed'
import { Session } from '@supabase/supabase-js'

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [stad, setStad] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  /*useEffect(() => {
    if (session) getProfile()
  }, [session])*/

  useEffect(() => { 
    if (session) { 
      setStatusMessage('User is logged in') 
      getProfile() 
    } else { 
      setStatusMessage('No user is logged in') 
    } 
  }, [session])

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url, stad`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
        setStad(data.stad)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
    stad,
  }: {
    username: string
    website: string
    avatar_url: string
    stad: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        stad,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    //<Text>{statusMessage}</Text>
   /* <View style={styles.verticallySpaced}>
    <Input label="Website" value={website || ''} onChangeText={(text) => setWebsite(text)} />
  </View>*/
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input label="Email" value={session?.user?.email} disabled />
      </View>
      <View style={styles.verticallySpaced}>
        <Input label="Gebruikersnaam" value={username || ''} onChangeText={(text) => setUsername(text)} />
      </View>
      <View style={styles.verticallySpaced}>
        <Input label="Stad" value={stad || ''} onChangeText={(text) => setStad(text)} />
      </View>
     

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
        buttonStyle={{ 
          borderRadius: 5, // Customize the button style 
          paddingVertical: 10, 
          paddingHorizontal: 20,
          backgroundColor: '#7A3038',
        }}
          title={loading ? 'Loading ...' : 'Update'}
          onPress={() => updateProfile({ username, website, stad, avatar_url: avatarUrl })}
          disabled={loading}
        />
      </View>

      <View style={styles.verticallySpaced}>
        <Button buttonStyle={{ 
          borderRadius: 5, // Customize the button style 
          paddingVertical: 10, 
          paddingHorizontal: 20,
          backgroundColor: '#7A3038',
        }}
        title="Uitloggen" onPress={() => supabase.auth.signOut()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})