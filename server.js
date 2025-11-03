const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const multer = require('multer')

const app = express()

const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
  console.log('Uploads folder created')
}
// Middleware
app.use(cors())
app.use(express.json())
app.use('/uploads', express.static('uploads'))

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ekzaria', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err))

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

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

// GET all recipients
app.get('/recipients', async (req, res) => {
  try {
    const recipients = await Recipient.find()
    res.json(recipients)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error' })
  }
})

// GET single recipient
app.get('/recipients/:id', async (req, res) => {
  try {
    const recipient = await Recipient.findById(req.params.id)
    res.json(recipient)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error' })
  }
})

// POST create recipient
app.post('/recipients', upload.single('photo'), async (req, res) => {
  try {
    const newRecipient = new Recipient({
      ...req.body,
      photo: req.file.path
    })
    await newRecipient.save()
    res.json(newRecipient)
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: 'Error' })
  }
})

// PUT update donation (ADD THIS ROUTE)
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
    console.log(err)
    res.status(500).json({ message: 'Error processing donation' })
  }
})

// Start Server
app.listen(3000, () => console.log('Server running on port 3000'))
