import { useState } from 'react'
import { api } from './api'

export default function App() {
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState({ username: '', email: '', password: '' })
  const [login, setLogin] = useState({ username: '', password: '' })
  const [book, setBook] = useState({
    title: '', isbn: '', price: '', publishedDate: '', description: ''
  })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [message, setMessage] = useState('')

 const loggedIn = Boolean(localStorage.getItem('token'))

  async function submitAuth(e) {
    e.preventDefault()
    setMessage('')
    try {
      if (mode === 'register') {
        await api.register(user)
        setMessage('Registration successful. Please log in.')
        setMode('login')
      } else {
        const data = await api.login(login)
        localStorage.setItem('token', data.accessToken)
        setMessage('Login successful.')
        window.location.reload()
      }
    } catch (e) { setMessage(e.message) }
  }

  async function addBook(e) {
    e.preventDefault()
    try {
      await api.addBook({ ...book, price: Number(book.price) })
      setMessage('Book added successfully. Audit event will be written in the background.')
      setBook({ title:'', isbn:'', price:'', publishedDate:'', description:'' })
    } catch (e) { setMessage(e.message) }
  }

  async function search(e) {
    e.preventDefault()
    try { setResults(await api.search(query)) }
    catch (e) { setMessage(e.message) }
  }

  if (!loggedIn) return (
    <main className="shell">
      <section className="card auth">
        <h1>📚 Library Portal</h1>
        <p>ReactJS + Spring Boot + PostgreSQL + pgvector</p>
        <form onSubmit={submitAuth}>
          {mode === 'register' && <>
            <input placeholder="Username" value={user.username}
              onChange={e=>setUser({...user,username:e.target.value})}/>
            <input placeholder="Email" type="email" value={user.email}
              onChange={e=>setUser({...user,email:e.target.value})}/>
          </>}
          <input placeholder="Username" value={mode==='register'?user.username:login.username}
            onChange={e=>mode==='register'
              ?setUser({...user,username:e.target.value})
              :setLogin({...login,username:e.target.value})}/>
          <input placeholder="Password" type="password" value={mode==='register'?user.password:login.password}
            onChange={e=>mode==='register'
              ?setUser({...user,password:e.target.value})
              :setLogin({...login,password:e.target.value})}/>
          <button>{mode === 'register' ? 'Register' : 'Login'}</button>
        </form>
        <button className="link" onClick={()=>setMode(mode==='register'?'login':'register')}>
          {mode==='register'?'Already a member? Login':'New member? Register'}
        </button>
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  )

  return (
    <main className="shell">
      <header>
        <div><h1>📚 Library Management Portal</h1><p>Secure member-only ReactJS interface</p></div>
        <button onClick={()=>{localStorage.removeItem('token');window.location.reload()}}>Logout</button>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="grid">
        <form className="card" onSubmit={addBook}>
          <h2>Add Book</h2>
          <input placeholder="Title" value={book.title} onChange={e=>setBook({...book,title:e.target.value})} required/>
          <input placeholder="13-digit ISBN" value={book.isbn} onChange={e=>setBook({...book,isbn:e.target.value})} required/>
          <input placeholder="Price" type="number" min="0.01" step="0.01" value={book.price} onChange={e=>setBook({...book,price:e.target.value})} required/>
          <input type="date" value={book.publishedDate} onChange={e=>setBook({...book,publishedDate:e.target.value})} required/>
          <textarea placeholder="Description" value={book.description} onChange={e=>setBook({...book,description:e.target.value})}/>
          <button>Add Book</button>
        </form>

        <form className="card" onSubmit={search}>
          <h2>Semantic Search</h2>
          <p>Query is converted to an embedding and matched using pgvector.</p>
          <input placeholder="e.g. books about web development" value={query} onChange={e=>setQuery(e.target.value)} required/>
          <button>Search</button>
          <div className="results">
            {results.map(b=><article key={b.id}>
              <strong>{b.title}</strong>
              <span>ISBN: {b.isbn}</span>
              <span>Price: ₹{b.price}</span>
              <span>Similarity: {b.similarity?.toFixed(4)}</span>
            </article>)}
          </div>
        </form>
      </section>
    </main>
  )
}
