require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const cloudinary = require('cloudinary').v2;
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' }); 

const app = express();
app.use(cors()); 
app.use(express.json());

mongoose.connect(process.env.DATABASE_URL, { family: 4 })
    .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
    .catch((erro) => console.log('❌ Erro ao conectar no banco:', erro));

const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true, unique: true },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true
    },
    senha: { type: String, required: true }
}, { timestamps: true });

const Usuario = mongoose.model('Usuario', UsuarioSchema, 'usuarios');

// ==========================================
// MODELO DE AVALIAÇÃO
// ==========================================
const AvaliacaoSchema = new mongoose.Schema({
    sujeito: { type: String, required: true },
    sabor: { type: String, required: true },
    valor: { type: Number, required: true },
    nota: { type: Number, required: true },
    valeu_a_pena: { type: Boolean, required: true },
    review: { type: String, required: false },
    foto_url: { type: String, required: true }
}, { timestamps: true });

const Avaliacao = mongoose.model('Avaliacao', AvaliacaoSchema, 'avaliacoes');

// ==========================================
// ROTAS
// ==========================================

// ROTA PARA PEDIR A RECUPERAÇÃO DE SENHA
app.post('/api/esqueci-senha', async (req, res) => {
    try {
        const { email } = req.body;

        const usuario = await Usuario.findOne({ email });
        if (!usuario) {
            return res.status(404).json({ erro: "Email não encontrado na nossa base." });
        }

        // 1. GERA UM CÓDIGO DE 6 DÍGITOS (Ex: 845129)
        const codigoPin = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Cria o token guardando o ID e o PIN lá dentro
        const tokenParaOFront = jwt.sign(
            { id: usuario._id, codigo: codigoPin }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15m' }
        );

        // 3. Manda só o PIN bonitão no email
        const { data, error } = await resend.emails.send({
            from: 'Suporte <onboarding@resend.dev>',
            to: usuario.email,
            subject: '🔒 Monster Reviews - Seu Código de Recuperação',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #121212; color: #fff; padding: 20px; border-radius: 8px; text-align: center;">
                    <h2 style="color: #00ff66;">E aí, filho da puta!</h2>
                    <p>Aqui está o seu código para criar uma nova senha:</p>
                    <h1 style="background-color: #222; padding: 15px; letter-spacing: 5px; color: #00ff66; border-radius: 8px;">${codigoPin}</h1>
                    <p style="color: #aaa; font-size: 12px;">Este código expira em 15 minutos.</p>
                </div>
            `
        });

                if (error) throw error;

        // 4. Manda o token na resposta pro Front-end guardar!
        res.status(200).json({ 
            mensagem: "Código enviado para o seu email!",
            tokenAuth: tokenParaOFront 
        });

    } catch (erro) {
        console.error("❌ Erro:", erro);
        res.status(500).json({ erro: "Erro ao enviar código de recuperação." });
    }
});


// ROTA PARA SALVAR A NOVA SENHA NO BANCO
app.post('/api/resetar-senha', async (req, res) => {
    try {
        // Agora recebemos o token (que o front guardou) e o código que o cara digitou
        const { token, codigoDigitado, novaSenha } = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verifica se o código que o cara digitou na tela é o mesmo que estava no token
        if (decoded.codigo !== codigoDigitado) {
            return res.status(400).json({ erro: "Código inválido. Verifique o número no email." });
        }

        const usuario = await Usuario.findById(decoded.id);
        const salt = await bcrypt.genSalt(10);
        usuario.senha = await bcrypt.hash(novaSenha, salt);
        await usuario.save();

        res.status(200).json({ mensagem: "Senha atualizada com sucesso!" });

    } catch (erro) {
        res.status(400).json({ erro: "Código expirado ou inválido." });
    }
});

// ROTA DE POSTAR AVALIAÇÃO
app.post('/api/avaliacoes', upload.single('foto'), async (req, res) => {
    try {
        console.log("📦 Dados recebidos do Front-end:", req.body);
        let linkDaFotoNaNuvem = '';

        if (req.file) {
            console.log("⏳ Subindo foto pro Cloudinary...");
            const resultado = await cloudinary.uploader.upload(req.file.path, {
                folder: 'MonsterReviews'
            });
            linkDaFotoNaNuvem = resultado.secure_url;
            console.log("✅ Foto na nuvem! Link:", linkDaFotoNaNuvem);
        }

        const novaAvaliacao = new Avaliacao({
            sujeito: req.body.sujeito,
            sabor: req.body.sabor,
            valor: req.body.valor,
            nota: req.body.nota,
            review: req.body.review,
            valeu_a_pena: req.body.valeu === 'sim', 
            foto_url: linkDaFotoNaNuvem 
        });

        await novaAvaliacao.save();
        res.status(201).json({ mensagem: "Avaliação salva com sucesso!", avaliacao: novaAvaliacao });

    } catch (erro) {
        console.error("❌ Erro ao salvar avaliação:", erro);
        res.status(500).json({ erro: "Erro ao processar a avaliação." });
    }
});

// ROTA DE CADASTRO COM VALIDAÇÃO DE E-MAIL ÚNICO
app.post('/api/auth/cadastro', async (req, res) => {
    try {

        const { login, email, password } = req.body;
        
        if (!login || !email || !password) {
            return res.status(400).json({ erro: 'Por favor, preencha todos os campos.' });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ erro: 'Formato de e-mail inválido.' });
        }

        const usuarioExiste = await Usuario.findOne({ nome: login });
        if (usuarioExiste) {
            return res.status(400).json({ erro: 'Este nome de usuário já está sendo usado.' });
        }
        
        const emailExiste = await Usuario.findOne({ email: email.toLowerCase() });
        if (emailExiste) {
            return res.status(400).json({ erro: 'Este e-mail já está cadastrado em outra conta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaCriptografada = await bcrypt.hash(password, salt);

        const novoUsuario = new Usuario({
            nome: login,
            email: email,
            senha: senhaCriptografada
        });

        await novoUsuario.save();


const token = jwt.sign(
    { 
        id: novoUsuario._id, 
        nome: novoUsuario.nome 
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
);

return res.status(201).json({
    mensagem: 'Usuário cadastrado com sucesso!',
    token: token,
    login: novoUsuario.nome,
    usuario: {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        email: novoUsuario.email
    }
});

    } catch (erro) {
        console.error("❌ Erro no cadastro:", erro);
        return res.status(500).json({ erro: 'Erro ao tentar cadastrar usuário.' });
    }
});

// ROTA DE LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { login, password, email } = req.body;

        // Agora o 'Usuario' existe aqui em cima e o Node vai achar!
        const emailEncontrado = await Usuario.findOne({ email: email })
        const usuarioEncontrado = await Usuario.findOne({ nome: login });
        if (!usuarioEncontrado || !emailEncontrado) {
            return res.status(400).json({ erro: 'Usuário ou senha incorretos.' });
        }

        const senhaValida = await bcrypt.compare(password, usuarioEncontrado.senha || password, emailEncontrado.senha);
        if (!senhaValida) {
            return res.status(400).json({ erro: 'Usuário ou senha incorretos.' });
        }

        const token = jwt.sign(
            { id: usuarioEncontrado._id, nome: usuarioEncontrado.nome }, 
            process.env.JWT_SECRET, 
            { expiresIn: "1h" }
        );
    
        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            token: token,
            login: usuarioEncontrado.nome,
            email: emailEncontrado.email
        });

    } catch (erro) {
        console.error("❌ Erro no login:", erro);
        return res.status(500).json({ erro: 'Erro ao tentar fazer login.' });
    }
});

// ROTA DE CRIAÇÃO DOS POSTS
app.get('/api/avaliacoes', async (req, res) => {
    try {
        // Busca todas as avaliações e ordena pelas mais recentes (createdAt: -1)
        const avaliacoes = await Avaliacao.find().sort({ createdAt: -1 });
        return res.status(200).json(avaliacoes);
    } catch (erro) {
        console.error("❌ Erro ao buscar avaliações:", erro);
        return res.status(500).json({ erro: "Erro ao carregar o feed." });
    }
});

// ROTA DO RANKING
app.get('/api/ranking', async (req, res) => {
    try {
        const ranking = await Avaliacao.aggregate([
            
            { 
                $group: { 
                    _id: "$sujeito", // Agrupa pelo nome de quem postou
                    totalLatinhas: { $sum: 1 } // Conta 1 para cada post
                } 
            },
            // 2º Passo: Ordena o resultado pela quantidade (do maior para o menor)
            { 
                $sort: { totalLatinhas: -1 } 
            },
            { 
                $limit: 3 
            }
        ]);

        return res.status(200).json(ranking);

    } catch (erro) {
        console.error("❌ Erro ao gerar ranking:", erro);
        return res.status(500).json({ erro: "Erro ao gerar o painel de liderança." });
    }
});

// ==========================================
// LIGANDO O SERVIDOR
// ==========================================
const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});
