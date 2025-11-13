from hiero_sdk_python import (
    Client,
    Network,
    AccountId,
    PrivateKey,
    TopicId,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
)
from cryptography.fernet import Fernet
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

operator_id = AccountId.from_string(os.getenv("OPERATOR_ID"))
operator_key = PrivateKey.from_string_ed25519(os.getenv("OPERATOR_KEY"))

# Load encryption key
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    raise ValueError("Missing ENCRYPTION_KEY in environment variables.")
fernet = Fernet(ENCRYPTION_KEY.encode())


def encrypt_message(message: str) -> str:
    """
    Encrypts a plaintext message using Fernet symmetric encryption.

    Args:
        message (str): The plaintext message to encrypt.

    Returns:
        str: The encrypted message as a UTF-8 string.
    """
    try:
        encrypted = fernet.encrypt(message.encode())
        return encrypted.decode()
    except Exception as e:
        raise ValueError(f"Encryption failed: {str(e)}")


def create_topic(memo="Star Venture Topic"):
    """
    Creates a new Hedera Consensus Service topic.

    Returns:
        str: The ID of the created topic as string.
    """
    network = Network(network="testnet")
    client = Client(network)
    client.set_operator(operator_id, operator_key)

    try:
        transaction = (
            TopicCreateTransaction(
                memo=memo,
                admin_key=operator_key.public_key(),
            )
            .freeze_with(client)
            .sign(operator_key)
        )

        receipt = transaction.execute(client)
        
        if receipt and receipt.topicId:
            topic_id_str = str(receipt.topicId)
            print(f"✅ Topic created with ID: {topic_id_str}")
            return topic_id_str
        else:
            print("❌ Topic creation failed: No topic ID returned.")
            return None
            
    except Exception as e:
        print(f"❌ Topic creation failed: {str(e)}")
        return None


def submit_message(topic_id: str, message: str):
    """
    Encrypts and submits a message to the specified HCS topic.

    Args:
        topic_id (str): The HCS topic ID as string
        message (str): Plaintext message to submit.

    Returns:
        dict: Result status and topic ID.
    """
    network = Network(network="testnet")
    client = Client(network)
    
    try:
        topic_id_obj = TopicId.from_string(topic_id)
    except Exception as e:
        return {"status": "failed", "message": f"Invalid topic ID: {str(e)}"}
    
    client.set_operator(operator_id, operator_key)

    try:
        encrypted_message = encrypt_message(message)
        transaction = (
            TopicMessageSubmitTransaction(topic_id=topic_id_obj, message=encrypted_message)
            .freeze_with(client)
            .sign(operator_key)
        )

        receipt = transaction.execute(client)
        print(f"✅ Encrypted message submitted to topic {topic_id}.")
        return {"status": "success", "topic": topic_id}

    except Exception as e:
        print(f"❌ Message submission failed: {str(e)}")
        return {"status": "failed", "message": f"Message submission failed: {str(e)}"}


def submit_venture_update(venture_name: str, topic_id: str, update_type: str, data: dict):
    """
    Submit a structured update to a venture's HCS topic.
    
    Args:
        venture_name (str): Name of the venture
        topic_id (str): HCS topic ID
        update_type (str): Type of update (venture_created, player_joined, ceo_selected, etc.)
        data (dict): Update data
    """
    message = {
        "venture": venture_name,
        "type": update_type,
        "data": data,
        "timestamp": datetime.now().isoformat(),
        "source": "star_governance_board"
    }
    
    import json
    return submit_message(topic_id, json.dumps(message))