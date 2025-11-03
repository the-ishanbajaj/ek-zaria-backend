const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

const app = express()

// CORS must be before routes
app.use(cors())
app.use(express.json())

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
  console.log('Uploads folder created')
}

// Serve static files from uploads folder
app.use('/uploads', express.static('uploads'))

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ekzaria', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err))

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
  }
})

const upload = multer({ storage: storage })

// Recipient Schema
const recipientSchema = new mongoose.Schema({
  name: String,
  address: String,
  reason: String,
  contactNumber: String,
  bankAccount: String,
  ifsc: String,
  targetAmount: Number,
  receivedAmount: { type: Number, default: 0 },
  photo: String
}, { timestamps: true })

const Recipient = mongoose.model('Recipient', recipientSchema)

// Routes
app.get('/recipients', async (req, res) => {
  try {
    const recipients = await Recipient.find()
    res.json(recipients)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error fetching recipients' })
  }
})

app.get('/recipients/:id', async (req, res) => {
  try {
    const recipient = await Recipient.findById(req.params.id)
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' })
    }
    res.json(recipient)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error fetching recipient' })
  }
})

app.post('/recipients', upload.single('photo'), async (req, res) => {
  try {
    const newRecipient = new Recipient({
      name: req.body.name,
      address: req.body.address,
      reason: req.body.reason,
      contactNumber: req.body.contactNumber,
      bankAccount: req.body.bankAccount,
      ifsc: req.body.ifsc,
      targetAmount: req.body.targetAmount,
      receivedAmount: 0,
      photo: req.file ? req.file.path : null
    })
    
    await newRecipient.save()
    res.status(201).json(newRecipient)
  } catch (err) {
    console.log('Error creating recipient:', err)
    res.status(500).json({ message: 'Error creating recipient' })
  }
})

app.put('/recipients/:id/donate', async (req, res) => {
  try {
    const recipient = await Recipient.findById(req.params.id)
    
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' })
    }
    
    const donationAmount = parseInt(req.body.amount)
    recipient.receivedAmount += donationAmount
    
    await recipient.save()
    res.json(recipient)
  } catch (err) {
    console.log('Error processing donation:', err)
    res.status(500).json({ message: 'Error processing donation' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
