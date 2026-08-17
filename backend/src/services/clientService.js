const { Client } = require('../models');
const { Op } = require('sequelize');

/**
 * 🔥 Busca ou cria um cliente baseado no telefone
 * @param {Object} data - Dados do cliente
 * @param {string} data.name - Nome do cliente
 * @param {string} data.phone - Telefone do cliente
 * @param {boolean} data.isMonthly - Se é mensalista
 * @param {number} data.monthlyFee - Valor da mensalidade
 * @param {boolean} data.isActive - Se está ativo
 * @returns {Promise<Object>} Cliente encontrado ou criado
 */
const findOrCreateClient = async (data) => {
  try {
    const { name, phone, isMonthly = false, monthlyFee = 0, isActive = true } = data;
    
    if (!phone) {
      throw new Error('Telefone é obrigatório');
    }
    
    // 🔥 1. PROCURAR POR TELEFONE
    let client = await Client.findOne({ 
      where: { 
        phone: phone.trim(),
        isActive: true 
      } 
    });
    
    // 🔥 2. SE EXISTIR, RETORNAR O CLIENTE EXISTENTE
    if (client) {
      console.log(`✅ Cliente encontrado pelo telefone ${phone}: ${client.name}`);
      
      // Atualizar nome se for diferente (opcional)
      if (name && client.name !== name.trim()) {
        await client.update({ name: name.trim() });
        console.log(`📝 Nome atualizado para: ${name}`);
      }
      
      return { client, created: false };
    }
    
    // 🔥 3. SE NÃO EXISTIR, CRIAR UM NOVO
    console.log(`📝 Criando novo cliente: ${name} - ${phone}`);
    client = await Client.create({
      name: name ? name.trim() : 'Cliente sem nome',
      phone: phone.trim(),
      isMonthly,
      monthlyFee,
      isActive,
    });
    
    console.log(`✅ Cliente criado: ${client.id}`);
    return { client, created: true };
  } catch (error) {
    console.error('❌ Erro no findOrCreateClient:', error);
    throw error;
  }
};

/**
 * 🔥 Buscar cliente por telefone
 * @param {string} phone - Telefone do cliente
 * @returns {Promise<Object|null>} Cliente ou null
 */
const findClientByPhone = async (phone) => {
  try {
    if (!phone) return null;
    return await Client.findOne({ 
      where: { 
        phone: phone.trim(),
        isActive: true 
      } 
    });
  } catch (error) {
    console.error('❌ Erro ao buscar cliente por telefone:', error);
    return null;
  }
};

/**
 * 🔥 Buscar cliente por ID
 * @param {string} id - ID do cliente
 * @returns {Promise<Object|null>} Cliente ou null
 */
const findClientById = async (id) => {
  try {
    if (!id) return null;
    return await Client.findByPk(id);
  } catch (error) {
    console.error('❌ Erro ao buscar cliente por ID:', error);
    return null;
  }
};

module.exports = {
  findOrCreateClient,
  findClientByPhone,
  findClientById,
};